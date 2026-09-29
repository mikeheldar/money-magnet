// Money Magnet — deterministic forecast engine (the POV wedge).
//
// Pure compute module: NO firebase imports. All data access is injected via
// `deps` — { getAccounts, getTransactionsByDateRange, getCategories, getGoals } —
// so the exact same engine runs in the browser (firebase-api.js binds its
// Firestore fetchers) and, later, inside Cloud Functions with admin-SDK
// fetchers, without the two-engines drift risk. Keep ALL forecast/coaching/
// commitment/spend-limit math here; the callers stay fetch-and-bind shims.
//
// `options.today` (ISO string) overrides the clock — for tests and scheduled
// server runs. Omitted = new Date(), unchanged browser behavior.
export async function computeForecastSeries(deps, options = {}) {

  const { startDate, endDate, grain = 'weekly' } = options
  const today = options.today ? new Date(options.today) : new Date()
  const todayStr = today.toISOString().split('T')[0]

  const accounts = await deps.getAccounts()
  const activeAccounts = accounts.filter(a => !a.is_closed)
  const activeIds = new Set(activeAccounts.map(a => a.id))

  function toStr(d) {
    return d.toISOString().split('T')[0]
  }
  function addDays(d, n) {
    const out = new Date(d)
    out.setDate(out.getDate() + n)
    return out
  }
  function addMonthsClamped(d, n) {
    const day = d.getDate()
    const out = new Date(d)
    out.setDate(1)
    out.setMonth(out.getMonth() + n)
    const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate()
    out.setDate(Math.min(day, lastDay))
    return out
  }

  // Deterministic engine: real balances in the past (reconstructed from actual
  // transactions), and for the future each recurring bill/income lands on its own
  // scheduled date while everything non-recurring flows at a rolling baseline rate.
  const BASELINE_DAYS = 90
  const CROSSING_HORIZON_DAYS = 1825 // goal crossings are searched up to 5 years out

  const windowStart = new Date(startDate)
  const windowEnd = new Date(endDate)
  const horizonCandidate = addDays(today, CROSSING_HORIZON_DAYS)
  const horizonEnd = horizonCandidate > windowEnd ? horizonCandidate : windowEnd
  const baselineStart = addDays(today, -BASELINE_DAYS)
  const historyStart = baselineStart < windowStart ? baselineStart : windowStart

  const history = (await deps.getTransactionsByDateRange(toStr(historyStart), todayStr))
    .filter(t => t.account_id && activeIds.has(t.account_id))

  const txnDelta = (t) => {
    const amt = Math.abs(parseFloat(t.amount) || 0)
    return t.type === 'income' ? amt : -amt
  }

  // Baseline: average daily net of NON-recurring flow only — recurring items are
  // modeled explicitly on their own dates below, so they must not also inflate the rate
  const baselineStartStr = toStr(baselineStart)
  let earliestStr = todayStr
  const baselineNetByAccount = {}
  history.forEach(t => {
    if (t.date < earliestStr) earliestStr = t.date
    if (t.recurring || t.date < baselineStartStr) return
    baselineNetByAccount[t.account_id] = (baselineNetByAccount[t.account_id] || 0) + txnDelta(t)
  })
  const observedDays = Math.min(
    BASELINE_DAYS,
    Math.max(7, Math.round((today - new Date(earliestStr)) / 864e5) + 1)
  )
  Object.keys(baselineNetByAccount).forEach(aid => {
    baselineNetByAccount[aid] /= observedDays
  })
  const baselineDailyNet = Object.values(baselineNetByAccount).reduce((s, v) => s + v, 0)

  // Recurring schedule: the latest occurrence of each recurring item (per account +
  // merchant + frequency) anchors its projected future dates and amount
  const recurringAnchors = {}
  history.forEach(t => {
    if (!t.recurring || !t.recurring_frequency) return
    const key = `${t.account_id}|${(t.merchant || t.description || '').toLowerCase()}|${t.recurring_frequency}`
    if (!recurringAnchors[key] || t.date > recurringAnchors[key].date) recurringAnchors[key] = t
  })

  const dayStrs = []
  for (let d = new Date(windowStart); d <= horizonEnd; d = addDays(d, 1)) dayStrs.push(toStr(d))
  const dayIndex = {}
  dayStrs.forEach((s, i) => { dayIndex[s] = i })
  let todayIdx = dayIndex[todayStr]
  if (todayIdx === undefined) todayIdx = todayStr < dayStrs[0] ? 0 : dayStrs.length - 1

  const deltasByAccount = {}
  activeAccounts.forEach(a => { deltasByAccount[a.id] = new Array(dayStrs.length).fill(0) })

  history.forEach(t => {
    const i = dayIndex[t.date]
    if (i !== undefined && i <= todayIdx) deltasByAccount[t.account_id][i] += txnDelta(t)
  })

  for (let i = todayIdx + 1; i < dayStrs.length; i++) {
    activeAccounts.forEach(a => {
      deltasByAccount[a.id][i] += baselineNetByAccount[a.id] || 0
    })
  }

  Object.values(recurringAnchors).forEach(t => {
    const arr = deltasByAccount[t.account_id]
    if (!arr) return
    const step = t.recurring_frequency === 'weekly'
      ? d => addDays(d, 7)
      : t.recurring_frequency === 'yearly'
        ? d => addMonthsClamped(d, 12)
        : d => addMonthsClamped(d, 1)
    let d = new Date(t.date)
    for (let guard = 0; guard < 800 && d <= horizonEnd; guard++) {
      const i = dayIndex[toStr(d)]
      if (i !== undefined && i > todayIdx) arr[i] += txnDelta(t)
      d = step(d)
    }
  })

  // Balance walk anchored at today's real balance: walking backward strips out the
  // actual deltas, walking forward adds the projected ones
  const dailyByAccount = {}
  activeAccounts.forEach(a => {
    const arr = new Array(dayStrs.length).fill(0)
    const deltas = deltasByAccount[a.id]
    arr[todayIdx] = a.balance_current || 0
    for (let i = todayIdx - 1; i >= 0; i--) arr[i] = arr[i + 1] - deltas[i + 1]
    for (let i = todayIdx + 1; i < arr.length; i++) arr[i] = arr[i - 1] + deltas[i]
    dailyByAccount[a.id] = arr
  })
  const dailyTotals = new Array(dayStrs.length).fill(0)
  activeAccounts.forEach(a => {
    const arr = dailyByAccount[a.id]
    for (let i = 0; i < dayStrs.length; i++) dailyTotals[i] += arr[i]
  })

  const buckets = []
  if (grain === 'daily') {
    for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
      buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
    }
  } else if (grain === 'weekly') {
    const weekStart = new Date(windowStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    for (let d = new Date(weekStart); d <= windowEnd; d = addDays(d, 7)) {
      buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
    }
  } else {
    let d = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1)
    while (d <= windowEnd) {
      buckets.push({ dateStr: toStr(d), label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) })
      d = addMonthsClamped(d, 1)
    }
  }

  const sampleAt = (arr, dateStr) => {
    let i = dayIndex[dateStr]
    if (i === undefined) i = dateStr < dayStrs[0] ? 0 : dayStrs.length - 1
    return Math.round(arr[i] * 100) / 100
  }

  let nowIndex = 0
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].dateStr >= todayStr) {
      nowIndex = i
      break
    }
    nowIndex = i
  }

  const totalValues = buckets.map(b => sampleAt(dailyTotals, b.dateStr))
  const series = activeAccounts.map(a => ({
    accountId: a.id,
    accountName: a.name,
    values: buckets.map(b => sampleAt(dailyByAccount[a.id], b.dateStr))
  }))

  // Goal crossings: the first projected day each save-up goal's tracked balance
  // (linked account if set, otherwise the total) reaches its target amount
  const allGoals = await deps.getGoals()
  const goals = allGoals
    .filter(g => (g.goal_type || 'save_up') !== 'spend_limit' && Number(g.target_amount) > 0)
    .map(g => {
      const tracked = g.linked_account_id && dailyByAccount[g.linked_account_id]
        ? dailyByAccount[g.linked_account_id]
        : dailyTotals
      const target = Number(g.target_amount)
      const alreadyMet = tracked[todayIdx] >= target
      let crossDate = null
      if (!alreadyMet) {
        for (let i = todayIdx + 1; i < dayStrs.length; i++) {
          if (tracked[i] >= target) {
            crossDate = dayStrs[i]
            break
          }
        }
      }
      const onTrack = g.target_date ? (alreadyMet || (crossDate !== null && crossDate <= g.target_date)) : null

      // Coaching: when the goal is drifting (or has no crossing at all), how much
      // more per month closes the gap — measured against the projected balance at
      // the target date, or a 12-month plan when there is no usable target date
      let coach = null
      if (!alreadyMet && (onTrack === false || crossDate === null)) {
        const MONTH_DAYS = 30.44
        let shortfall, daysLeft, horizonMonths
        let ti = g.target_date ? dayIndex[g.target_date] : undefined
        if (ti === undefined && g.target_date && g.target_date > dayStrs[dayStrs.length - 1]) {
          ti = dayStrs.length - 1
        }
        if (ti !== undefined && ti > todayIdx + 7) {
          shortfall = target - tracked[ti]
          daysLeft = ti - todayIdx
          horizonMonths = null
        } else {
          shortfall = target - tracked[todayIdx]
          daysLeft = 365
          horizonMonths = 12
        }
        if (shortfall > 0) {
          coach = {
            shortfall: Math.round(shortfall * 100) / 100,
            requiredExtraPerMonth: Math.round((shortfall / (daysLeft / MONTH_DAYS)) * 100) / 100,
            horizonMonths
          }
        }
      }

      // Future trajectory of the tracked balance (today -> horizon), so the UI can
      // answer "what if I saved $X/mo more?" instantly: the what-if crossing is just
      // the first day where daily[i] + extraPerDay*i reaches the target - no refetch
      const projectionDaily = []
      for (let i = todayIdx; i < dayStrs.length; i++) {
        projectionDaily.push(Math.round(tracked[i] * 100) / 100)
      }

      return {
        id: g.id,
        title: g.title,
        mantra: g.mantra || null,
        target_amount: target,
        target_date: g.target_date || null,
        linked_account_id: g.linked_account_id || null,
        commitment: g.commitment || null,
        alreadyMet,
        crossDate,
        onTrack,
        coach,
        projection: { start: dayStrs[todayIdx], daily: projectionDaily }
      }
    })

  // Where the flexible money is: top non-recurring spending categories over the
  // baseline window, monthly-ized — recurring bills are excluded because they're
  // commitments, not levers. Categories are fetched once, lazily, only when a
  // goal needs coaching or has an accepted commitment to check.
  let flexSpend = []
  const committedGoals = goals.filter(g => g.commitment && g.commitment.category_id && !g.alreadyMet)
  const byId = {}
  if (goals.some(g => g.coach) || committedGoals.length > 0) {
    let cats = []
    try {
      cats = await deps.getCategories()
    } catch (e) {
      console.warn('forecast: categories unavailable, using ids only')
    }
    cats.forEach(c => { byId[c.id] = c })
  }
  // Roll a child category up to its parent (same grouping rule as Budget/Goals)
  const rootOf = (cid) => {
    const cat = byId[cid]
    return cat && cat.parent_id && byId[cat.parent_id] ? cat.parent_id : cid
  }
  if (goals.some(g => g.coach)) {
    const spendByCat = {}
    history.forEach(t => {
      if (t.recurring || t.type !== 'expense' || t.date < baselineStartStr) return
      const key = t.category_id || 'uncategorized'
      spendByCat[key] = (spendByCat[key] || 0) + Math.abs(parseFloat(t.amount) || 0)
    })
    const rolled = {}
    Object.entries(spendByCat).forEach(([cid, total]) => {
      const rootId = rootOf(cid)
      rolled[rootId] = (rolled[rootId] || 0) + total
    })
    flexSpend = Object.entries(rolled)
      .map(([cid, total]) => ({
        categoryId: cid === 'uncategorized' ? null : cid,
        name: byId[cid] ? byId[cid].name : 'Uncategorized',
        perMonth: Math.round((total / observedDays) * 30.44 * 100) / 100
      }))
      .sort((a, b) => b.perMonth - a.perMonth)
      .slice(0, 3)
  }

  // Commitment adherence: when the user accepted the coach's plan ("save $X/mo
  // more out of category C"), compare month-to-date spend in C against a
  // pro-rated allowance = the category's baseline monthly spend minus $X
  if (committedGoals.length > 0) {
    const todayStr = dayStrs[todayIdx]
    const monthStartStr = todayStr.slice(0, 8) + '01'
    const [cy, cm, cd] = todayStr.split('-').map(Number)
    const daysInMonth = new Date(cy, cm, 0).getDate()
    const parseDay = (s) => {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const historyStartStr = toStr(historyStart)
    committedGoals.forEach(g => {
      const rootId = rootOf(g.commitment.category_id)
      let mtdSpend = 0
      let baseTotal = 0
      const catTxns = []
      history.forEach(t => {
        if (t.recurring || t.type !== 'expense') return
        if (rootOf(t.category_id || 'uncategorized') !== rootId) return
        const amt = Math.abs(parseFloat(t.amount) || 0)
        if (t.date >= baselineStartStr) baseTotal += amt
        if (t.date >= monthStartStr && t.date <= todayStr) mtdSpend += amt
        catTxns.push({ date: t.date, amt })
      })
      const basePerMonth = (baseTotal / observedDays) * 30.44
      const allowance = Math.max(0, basePerMonth - Number(g.commitment.extra_per_month || 0))

      // Week-over-week adherence since acceptance: each COMPLETED calendar week
      // (Mon-Sun, only weeks inside the fetched history) is "kept" when category
      // spend stayed within the weekly allowance; the acceptance week is pro-rated
      // from the acceptance day. Streaks count back from the last completed week.
      const weeklyAllowance = allowance * 7 / 30.44
      const acceptedStr = String(g.commitment.accepted_date || todayStr).slice(0, 10)
      const weeks = []
      const firstMonday = parseDay(acceptedStr)
      firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7))
      for (let ws = firstMonday; weeks.length < 26; ws = addDays(ws, 7)) {
        const wsStr = toStr(ws)
        const weStr = toStr(addDays(ws, 6))
        if (weStr >= todayStr) break // current week is not over yet
        if (wsStr < historyStartStr) continue // no transaction data that far back
        const fromStr = wsStr > acceptedStr ? wsStr : acceptedStr
        const coveredDays = Math.round((parseDay(weStr) - parseDay(fromStr)) / 864e5) + 1
        const weekAllow = weeklyAllowance * (coveredDays / 7)
        let spent = 0
        catTxns.forEach(t => {
          if (t.date >= fromStr && t.date <= weStr) spent += t.amt
        })
        weeks.push({
          start: wsStr,
          spent: Math.round(spent * 100) / 100,
          allowance: Math.round(weekAllow * 100) / 100,
          kept: spent <= weekAllow
        })
      }
      let keptStreak = 0
      let brokenStreak = 0
      for (let i = weeks.length - 1; i >= 0 && weeks[i].kept; i--) keptStreak++
      for (let i = weeks.length - 1; i >= 0 && !weeks[i].kept; i--) brokenStreak++

      g.commitmentStatus = {
        mtdSpend: Math.round(mtdSpend * 100) / 100,
        allowance: Math.round(allowance * 100) / 100,
        onPace: mtdSpend <= allowance * (cd / daysInMonth),
        weeks: weeks.slice(-8),
        keptStreak,
        brokenStreak
      }
    })
  }

  // Spending-limit goals: cap adherence for the goal's period (custom range, or the
  // current calendar month). Mirrors Goals.vue exactly — its own unfiltered fetch over
  // the union of goal ranges, category + direct children, recurring included — so this
  // verdict always matches the number on the Goals page. Fetch only fires when
  // spend-limit goals exist.
  let spendLimits = []
  const slGoals = allGoals.filter(g =>
    (g.goal_type || 'save_up') === 'spend_limit' && g.category_id && Number(g.target_amount) > 0)
  if (slGoals.length > 0) {
    let slCats = Object.values(byId)
    if (slCats.length === 0) {
      try {
        slCats = await deps.getCategories()
      } catch (e) {
        console.warn('forecast: categories unavailable for spend limits')
      }
    }
    const slRange = (g) => {
      if (g.target_start_date && g.target_end_date) {
        return { start: g.target_start_date, end: g.target_end_date }
      }
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] }
    }
    const slRanges = slGoals.map(slRange)
    const slStart = slRanges.map(r => r.start).sort()[0]
    const slEnd = slRanges.map(r => r.end).sort().slice(-1)[0]
    let slTxns = []
    try {
      slTxns = await deps.getTransactionsByDateRange(slStart, slEnd)
    } catch (e) {
      console.warn('forecast: spend-limit transactions unavailable:', e.message)
    }
    const parseD = (s) => {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    spendLimits = slGoals.map((g, i) => {
      const { start, end } = slRanges[i]
      const ids = new Set([g.category_id])
      slCats.forEach(c => { if (c.parent_id === g.category_id) ids.add(c.id) })
      let spent = 0
      slTxns.forEach(t => {
        if (t.type !== 'expense' || !ids.has(t.category_id)) return
        if (!t.date || t.date < start || t.date > end) return
        spent += Math.abs(parseFloat(t.amount) || 0)
      })
      const target = Number(g.target_amount)
      const totalDays = Math.max(1, Math.round((parseD(end) - parseD(start)) / 864e5) + 1)
      const doneDays = Math.min(totalDays, Math.max(0, Math.round((parseD(todayStr) - parseD(start)) / 864e5) + 1))
      const elapsedFrac = doneDays / totalDays
      const ended = todayStr > end
      // 'hot' = under the cap but ahead of the pro-rated burn rate for this point
      // in the period — the drift signal, before the cap is actually blown
      let status
      if (ended) status = spent <= target ? 'ended_kept' : 'ended_over'
      else if (spent > target) status = 'over'
      else if (spent > target * elapsedFrac) status = 'hot'
      else status = 'ok'
      const cat = slCats.find(c => c.id === g.category_id)
      return {
        id: g.id,
        title: g.title,
        category_id: g.category_id,
        category_name: cat ? cat.name : 'Category',
        target_amount: target,
        start,
        end,
        defaultPeriod: !(g.target_start_date && g.target_end_date),
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round((target - spent) * 100) / 100,
        projected: elapsedFrac > 0 ? Math.round((spent / elapsedFrac) * 100) / 100 : Math.round(spent * 100) / 100,
        status
      }
    })
  }

  return {
    labels: buckets.map(b => b.label),
    nowIndex,
    series,
    totalValues,
    bucketDates: buckets.map(b => b.dateStr),
    // Total-balance future trajectory (today -> horizon), so a not-yet-created
    // goal (guided first-goal flow) can be given the SAME crossing date the
    // roadmap will draw once it exists - a suggestion the forecast then honors
    totalProjection: {
      start: dayStrs[todayIdx],
      daily: dailyTotals.slice(todayIdx).map(v => Math.round(v * 100) / 100)
    },
    goals,
    spendLimits,
    meta: {
      baselineDailyNet: Math.round(baselineDailyNet * 100) / 100,
      observedDays,
      recurringCount: Object.keys(recurringAnchors).length,
      horizonDays: CROSSING_HORIZON_DAYS,
      flexSpend
    }
  }
}
