// Tests for the pure forecast engine (src/services/forecast-engine.js).
// Run: npm test (TZ=UTC node --test test/) — TZ pinned because the engine
// mixes UTC date strings (toISOString) with local-time Date math, the same
// known quirk browsers have; UTC makes fixtures deterministic on any box.
//
// The frontend package is CJS to node (no "type":"module"), so the ESM
// engine file is loaded by copying it to a temp .mjs — it has zero imports,
// which is exactly the property that keeps it server-consumable. If this
// loader breaks, someone added an import to the engine: that's the signal
// to stop and rethink, not to patch the loader.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../src/services/forecast-engine.js'), 'utf8')
const tmp = join(mkdtempSync(join(tmpdir(), 'mm-engine-')), 'forecast-engine.mjs')
writeFileSync(tmp, src)
const { computeForecastSeries } = await import(pathToFileURL(tmp))

// Frozen clock: mid-month, midday UTC so todayStr is stable in any TZ
const TODAY = '2026-09-15T12:00:00Z'
const OPTS = { startDate: '2026-09-01', endDate: '2026-09-30', grain: 'daily', today: TODAY }

function mkDeps({ accounts = [], txns = [], goals = [], cats = [] }) {
  const calls = { accounts: 0, txns: [], cats: 0, goals: 0 }
  const deps = {
    getAccounts: async () => { calls.accounts++; return accounts },
    getTransactionsByDateRange: async (start, end) => {
      calls.txns.push([start, end])
      return txns.filter(t => t.date >= start && t.date <= end)
    },
    getCategories: async () => { calls.cats++; return cats },
    getGoals: async () => { calls.goals++; return goals }
  }
  return { deps, calls }
}

const at = (res, dateStr) => res.totalValues[res.bucketDates.indexOf(dateStr)]

test('past balances reconstructed by walking real transactions back from today', async () => {
  const { deps, calls } = mkDeps({
    accounts: [{ id: 'a1', name: 'Checking', balance_current: 1000 }],
    txns: [
      { account_id: 'a1', date: '2026-09-05', amount: 200, type: 'income' },
      { account_id: 'a1', date: '2026-09-10', amount: 100, type: 'expense' }
    ]
  })
  const res = await computeForecastSeries(deps, OPTS)
  assert.equal(at(res, '2026-09-15'), 1000)          // anchored at today's real balance
  assert.equal(at(res, '2026-09-09'), 1100)          // before the -100 expense
  assert.equal(at(res, '2026-09-04'), 900)           // before the +200 income too
  // baseline: net +100 over 12 observed days (earliest txn 9/05 -> today)
  assert.equal(res.meta.observedDays, 12)
  assert.equal(res.meta.baselineDailyNet, 8.33)
  assert.equal(at(res, '2026-09-16'), 1008.33)       // future flows at the baseline rate
  assert.equal(res.totalProjection.start, '2026-09-15')
  assert.equal(res.totalProjection.daily[0], 1000)
  assert.equal(res.meta.recurringCount, 0)
  // laziness guards: one history fetch, categories never fetched without goals
  assert.equal(calls.txns.length, 1)
  assert.equal(calls.cats, 0)
})

test('recurring bill lands on its scheduled date, not smeared into the baseline', async () => {
  const rent = d => ({ account_id: 'a1', date: d, amount: 500, type: 'expense', merchant: 'Rent', recurring: true, recurring_frequency: 'monthly' })
  const { deps } = mkDeps({
    accounts: [{ id: 'a1', name: 'Checking', balance_current: 500 }],
    txns: [rent('2026-06-20'), rent('2026-07-20'), rent('2026-08-20')]
  })
  const res = await computeForecastSeries(deps, OPTS)
  assert.equal(res.meta.recurringCount, 1)           // 3 rows dedupe to one anchor
  assert.equal(res.meta.baselineDailyNet, 0)         // recurring excluded from baseline
  assert.equal(at(res, '2026-09-19'), 500)
  assert.equal(at(res, '2026-09-20'), 0)             // -500 exactly on the projected date
  assert.equal(at(res, '2026-09-30'), 0)
})

test('save-up goal gets the first projected crossing date; met goals short-circuit', async () => {
  const income = d => ({ account_id: 'a1', date: d, amount: 100, type: 'income' })
  const days = Array.from({ length: 10 }, (_, i) => `2026-09-${String(6 + i).padStart(2, '0')}`)
  const { deps, calls } = mkDeps({
    accounts: [{ id: 'a1', name: 'Checking', balance_current: 1000 }],
    txns: days.map(income),
    goals: [
      { id: 'g1', title: 'Emergency fund', target_amount: 1500, target_date: '2026-09-25' },
      { id: 'g2', title: 'Done already', target_amount: 800 }
    ]
  })
  const res = await computeForecastSeries(deps, OPTS)
  const [g1, g2] = res.goals
  // +1000 over 11 observed days = 90.91/day -> needs 6 days to add the missing 500
  assert.equal(g1.alreadyMet, false)
  assert.equal(g1.crossDate, '2026-09-21')
  assert.equal(g1.onTrack, true)                     // 9/21 <= target 9/25
  assert.equal(g1.coach, null)
  assert.equal(g1.projection.daily[0], 1000)
  assert.equal(g2.alreadyMet, true)
  assert.equal(g2.crossDate, null)
  assert.equal(g2.onTrack, null)                     // no target_date
  assert.equal(calls.cats, 0)                        // nobody needed coaching
})

const COACH_FIXTURE = {
  accounts: [{ id: 'a1', name: 'Checking', balance_current: 1000 }],
  cats: [
    { id: 'catP', name: 'Dining' },
    { id: 'catC', name: 'Coffee', parent_id: 'catP' },
    { id: 'catO', name: 'Fun' }
  ],
  txns: [
    { account_id: 'a1', date: '2026-06-18', amount: 100, type: 'expense', category_id: 'catC' },
    { account_id: 'a1', date: '2026-07-10', amount: 100, type: 'expense', category_id: 'catC' },
    { account_id: 'a1', date: '2026-08-10', amount: 100, type: 'expense', category_id: 'catC' },
    { account_id: 'a1', date: '2026-09-05', amount: 60, type: 'expense', category_id: 'catC' },
    { account_id: 'a1', date: '2026-08-15', amount: 90, type: 'expense', category_id: 'catP' },
    { account_id: 'a1', date: '2026-07-20', amount: 90, type: 'expense', category_id: 'catO' }
  ]
}

test('drifting goal gets a coach block + flexSpend rolls children up to parents', async () => {
  const { deps } = mkDeps({
    ...COACH_FIXTURE,
    goals: [{ id: 'g3', title: 'House', target_amount: 5000, target_date: '2026-12-31' }]
  })
  const res = await computeForecastSeries(deps, OPTS)
  const g = res.goals[0]
  // burn = 540 spent / 90 observed days = exactly -6/day; 107 days to 12/31
  assert.equal(res.meta.observedDays, 90)
  assert.equal(res.meta.baselineDailyNet, -6)
  assert.equal(g.crossDate, null)
  assert.equal(g.coach.shortfall, 4642)              // 5000 - (1000 - 6*107)
  assert.equal(g.coach.requiredExtraPerMonth, 1320.58)
  assert.equal(g.coach.horizonMonths, null)          // real target date was usable
  // flexSpend: Coffee (child) rolls into Dining (parent): 450 vs Fun 90, monthly-ized
  assert.equal(res.meta.flexSpend.length, 2)
  assert.deepEqual(res.meta.flexSpend[0], { categoryId: 'catP', name: 'Dining', perMonth: 152.2 })
  assert.equal(res.meta.flexSpend[1].perMonth, 30.44)
})

test('accepted commitment: pro-rated allowance, MTD pace, weekly kept/broken history', async () => {
  const { deps } = mkDeps({
    ...COACH_FIXTURE,
    goals: [{
      id: 'g4', title: 'Trip', target_amount: 9999999,
      commitment: { extra_per_month: 50, category_id: 'catC', accepted_date: '2026-08-31' }
    }]
  })
  const res = await computeForecastSeries(deps, OPTS)
  const cs = res.goals[0].commitmentStatus
  // category baseline 450/90*30.44 = 152.20/mo, minus the committed 50
  assert.equal(cs.allowance, 102.2)
  assert.equal(cs.mtdSpend, 60)
  assert.equal(cs.onPace, false)                     // 60 > 102.2 * (15/30)
  // accepted Mon 8/31: week1 (8/31-9/6) blown by the 9/05 coffee run, week2 clean,
  // week3 still in progress so it must not appear
  assert.equal(cs.weeks.length, 2)
  assert.deepEqual(cs.weeks[0], { start: '2026-08-31', spent: 60, allowance: 23.5, kept: false })
  assert.equal(cs.weeks[1].kept, true)
  assert.equal(cs.keptStreak, 1)
  assert.equal(cs.brokenStreak, 0)
})

test('spend-limit goals: over / hot (trending) / ended_kept verdicts', async () => {
  const { deps, calls } = mkDeps({
    accounts: [{ id: 'a1', name: 'Checking', balance_current: 1000 }],
    cats: [
      { id: 'food', name: 'Food' },
      { id: 'coffee', name: 'Coffee', parent_id: 'food' },
      { id: 'x', name: 'X' },
      { id: 'z', name: 'Z' }
    ],
    goals: [
      { id: 'sl1', title: 'Food cap', goal_type: 'spend_limit', category_id: 'food', target_amount: 300 },
      { id: 'sl2', title: 'August X', goal_type: 'spend_limit', category_id: 'x', target_amount: 300, target_start_date: '2026-08-01', target_end_date: '2026-08-31' },
      { id: 'sl3', title: 'Z cap', goal_type: 'spend_limit', category_id: 'z', target_amount: 50 }
    ],
    txns: [
      { account_id: 'a1', date: '2026-09-02', amount: 100, type: 'expense', category_id: 'food' },
      { account_id: 'a1', date: '2026-09-10', amount: 120, type: 'expense', category_id: 'coffee' },
      { account_id: 'a1', date: '2026-08-05', amount: 100, type: 'expense', category_id: 'x' },
      { account_id: 'a1', date: '2026-09-03', amount: 80, type: 'expense', category_id: 'z' }
    ]
  })
  const res = await computeForecastSeries(deps, OPTS)
  const [sl1, sl2, sl3] = res.spendLimits
  // Food cap counts the child category too: 100 + 120 = 220 of 300, but at
  // day 15/30 that's ahead of the pro-rated burn -> 'hot', projecting 440
  assert.equal(sl1.category_name, 'Food')
  assert.equal(sl1.spent, 220)
  assert.equal(sl1.status, 'hot')
  assert.equal(sl1.projected, 440)
  assert.equal(sl2.status, 'ended_kept')             // custom range over, cap held
  assert.equal(sl3.status, 'over')
  assert.equal(sl3.remaining, -30)
  assert.equal(calls.txns.length, 2)                 // history + one union-range SL fetch
})
