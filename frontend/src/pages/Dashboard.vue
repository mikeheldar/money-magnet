<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-mb-md" style="border-radius: 12px; border-left: 4px solid #3BA99F;">
          <q-card-section class="q-py-sm">
            <template v-if="mantraBanner">
              <div class="text-caption text-grey-7 q-mb-xs">Your mantra</div>
              <div class="text-h6" style="color: #3BA99F; font-weight: 600;">“{{ mantraBanner.text }}”</div>
              <div class="text-caption text-grey-6 q-mt-xs">— your words, for {{ mantraBanner.goalTitle }}</div>
            </template>
            <template v-else>
              <div class="text-h6" style="color: #3BA99F; font-weight: 600;">Where intention meets numbers—manifest your financial future.</div>
              <div class="text-body2 text-grey-7 q-mt-xs">Set your money intentions, track where you are, and see where you're going.</div>
            </template>
            <div v-if="groundedLine" class="text-body2 text-weight-medium q-mt-sm" style="color: #3BA99F;">{{ groundedLine }}</div>
            <div v-if="beliefJournal.length" class="q-mt-sm">
              <q-btn
                flat dense no-caps size="sm" color="grey-7"
                :icon="journalOpen ? 'expand_less' : 'menu_book'"
                :label="journalOpen ? 'Hide journal' : 'Belief journal'"
                @click="journalOpen = !journalOpen"
              />
              <span v-if="beliefRecap" class="text-caption text-grey-6 q-ml-sm">{{ beliefRecap }}</span>
              <q-slide-transition>
                <div v-show="journalOpen" class="q-mt-xs">
                  <div v-for="e in beliefJournal.slice(0, 14)" :key="e.day" class="q-py-xs" style="border-top: 1px solid #eee;">
                    <div class="text-caption text-grey-6">{{ journalDate(e.day) }}</div>
                    <div class="text-body2" style="color: #2c3e50;">
                      “{{ e.mantra }}”<span v-if="e.personal && e.goal_title" class="text-grey-6"> — for {{ e.goal_title }}</span>
                    </div>
                    <div v-if="e.fact" class="text-caption" style="color: #3BA99F;">{{ e.fact }}</div>
                  </div>
                  <div v-if="beliefAllTime" class="text-caption text-grey-6 q-pt-xs" style="border-top: 1px solid #eee;">{{ beliefAllTime }}</div>
                </div>
              </q-slide-transition>
            </div>
          </q-card-section>
        </q-card>
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Financial Dashboard</div>
            
            <q-btn-toggle
              v-model="period"
              toggle-color="primary"
              :options="[
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' }
              ]"
              @update:model-value="loadSummary"
            />
          </q-card-section>

          <q-card-section v-if="summary">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-card class="bg-positive text-white" style="border-radius: 12px;">
                  <q-card-section>
                    <div class="text-h6" style="opacity: 0.9;">Income</div>
                    <div class="text-h4" style="font-weight: 600;">${{ formatCurrency(summary.income) }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card class="bg-negative text-white" style="border-radius: 12px;">
                  <q-card-section>
                    <div class="text-h6" style="opacity: 0.9;">Expenses</div>
                    <div class="text-h4" style="font-weight: 600;">${{ formatCurrency(summary.expense) }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card :class="summary.net >= 0 ? 'bg-primary text-white' : 'bg-warning text-white'" style="border-radius: 12px;">
                  <q-card-section>
                    <div class="text-h6" style="opacity: 0.9;">Net</div>
                    <div class="text-h4" style="font-weight: 600;">${{ formatCurrency(summary.net) }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>


      <!-- Goal pace — on track / drifting verdicts from the forecast engine -->
      <div v-if="goalPace.length > 0 || spendLimitPace.length > 0" class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-h6" style="color: #3BA99F; font-weight: 600;">Goals — are you on pace?</div>
              <q-space />
              <q-btn flat dense no-caps color="primary" label="Open Forecast" to="/forecast" />
            </div>
            <div class="row q-col-gutter-md">
              <div v-for="g in goalPace" :key="g.id" class="col-12 col-md-4">
                <q-card flat bordered :class="paceCardClass(g)" style="border-radius: 12px; height: 100%;">
                  <q-card-section class="q-py-sm">
                    <div class="text-subtitle2" style="font-weight: 600;">{{ g.title }}</div>
                    <template v-if="g.alreadyMet">
                      <div class="text-body2 q-mt-xs">🎉 Already at ${{ formatCurrency(g.target_amount) }}</div>
                    </template>
                    <template v-else-if="g.crossDate">
                      <div class="text-body2 q-mt-xs">
                        On pace to reach ${{ formatCurrency(g.target_amount) }} on
                        <span style="color: #3BA99F; font-weight: 600;">{{ formatDay(g.crossDate) }}</span>
                      </div>
                      <q-chip
                        v-if="g.onTrack === true"
                        dense size="sm" color="green" text-color="white" class="q-mt-xs"
                      >On track for {{ formatDay(g.target_date) }}</q-chip>
                      <q-chip
                        v-else-if="g.onTrack === false"
                        dense size="sm" color="orange" text-color="white" class="q-mt-xs"
                      >Drifting — target was {{ formatDay(g.target_date) }}</q-chip>
                      <div v-if="g.coach" class="text-caption text-grey-8 q-mt-xs">{{ coachLine(g) }}</div>
                    </template>
                    <template v-else>
                      <div class="text-body2 q-mt-xs">
                        Not on pace to reach ${{ formatCurrency(g.target_amount) }} within 5 years
                      </div>
                      <q-chip dense size="sm" color="red" text-color="white" class="q-mt-xs">Off pace</q-chip>
                      <div v-if="g.coach" class="text-caption text-grey-8 q-mt-xs">{{ coachLine(g) }}</div>
                    </template>
                    <div v-if="g.coach && !g.commitment" class="q-mt-xs">
                      <q-btn
                        dense flat no-caps size="sm" color="primary"
                        :label="'Commit: save $' + formatCurrency(g.coach.requiredExtraPerMonth) + '/mo'"
                        :loading="committing === g.id"
                        @click="commitToPlan(g)"
                      />
                    </div>
                    <div v-if="g.commitment && !g.alreadyMet" class="text-caption q-mt-xs">
                      <div class="text-grey-8">
                        Committed {{ formatDay(g.commitment.accepted_date) }}: save
                        ${{ formatCurrency(g.commitment.extra_per_month) }}/mo more<template v-if="g.commitment.category_name"> from {{ g.commitment.category_name }}</template>
                        <q-btn dense flat round size="xs" icon="close" color="grey" @click="dropCommitment(g)">
                          <q-tooltip>Drop this commitment</q-tooltip>
                        </q-btn>
                      </div>
                      <div v-if="g.commitmentStatus">
                        {{ g.commitment.category_name }}: ${{ formatCurrency(g.commitmentStatus.mtdSpend) }} spent of
                        ${{ formatCurrency(g.commitmentStatus.allowance) }} this month
                        <q-chip dense size="sm" :color="g.commitmentStatus.onPace ? 'green' : 'orange'" text-color="white">
                          {{ g.commitmentStatus.onPace ? 'Keeping it' : 'Over pace' }}
                        </q-chip>
                        <div v-if="g.commitmentStatus.weeks && g.commitmentStatus.weeks.length" class="q-mt-xs">
                          <q-icon
                            v-for="w in g.commitmentStatus.weeks" :key="w.start"
                            :name="w.kept ? 'check_circle' : 'cancel'"
                            :color="w.kept ? 'green' : 'orange'"
                            size="14px" class="q-mr-xs"
                          >
                            <q-tooltip>Week of {{ formatDay(w.start) }}: ${{ formatCurrency(w.spent) }} of ${{ formatCurrency(w.allowance) }}</q-tooltip>
                          </q-icon>
                          <span v-if="g.commitmentStatus.keptStreak >= 2" class="text-green-8" style="font-weight: 600;">
                            {{ g.commitmentStatus.keptStreak }}-week streak — keep it going
                          </span>
                          <span v-else-if="g.commitmentStatus.brokenStreak >= 2" class="text-orange-9" style="font-weight: 600;">
                            Over pace {{ g.commitmentStatus.brokenStreak }} weeks running — tighten {{ g.commitment.category_name }} or adjust the plan
                          </span>
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div v-for="s in spendLimitPace" :key="s.id" class="col-12 col-md-4">
                <q-card flat bordered :class="limitCardClass(s)" style="border-radius: 12px; height: 100%;">
                  <q-card-section class="q-py-sm">
                    <div class="text-subtitle2" style="font-weight: 600;">{{ s.title }}</div>
                    <div class="text-body2 q-mt-xs">
                      {{ s.category_name }}: ${{ formatCurrency(s.spent) }} of ${{ formatCurrency(s.target_amount) }}
                      {{ s.defaultPeriod ? 'this month' : 'this period' }} —
                      <span :class="s.remaining < 0 ? 'text-negative' : ''">{{ limitRemainingLabel(s) }}</span>
                    </div>
                    <q-chip
                      v-if="s.status === 'over' || s.status === 'ended_over'"
                      dense size="sm" color="red" text-color="white" class="q-mt-xs"
                    >Over the cap</q-chip>
                    <q-chip
                      v-else-if="s.status === 'hot'"
                      dense size="sm" color="orange" text-color="white" class="q-mt-xs"
                    >Trending over — ~${{ formatCurrency(s.projected) }} by {{ formatDay(s.end) }}</q-chip>
                    <q-chip
                      v-else-if="s.status === 'ended_kept'"
                      dense size="sm" color="green" text-color="white" class="q-mt-xs"
                    >Kept the cap 🎉</q-chip>
                    <q-chip
                      v-else
                      dense size="sm" color="green" text-color="white" class="q-mt-xs"
                    >Within cap</q-chip>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Account Balances Chart -->
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-md" style="color: #3BA99F; font-weight: 600;">Account Balances</div>
            
            <div class="q-mb-md">
              <q-btn-toggle
                v-model="balanceGroupBy"
                toggle-color="primary"
                :options="[
                  { label: 'By Account', value: 'account' },
                  { label: 'By Type', value: 'type' },
                  { label: 'By Category', value: 'category' }
                ]"
                @update:model-value="loadBalanceData"
              />
            </div>

            <div v-if="balanceData.length > 0" style="position: relative; height: 400px;">
              <canvas ref="balanceChart"></canvas>
            </div>
            <div v-else class="text-center text-grey q-pa-md">
              No account balance data available
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default defineComponent({
  name: 'DashboardPage',
  setup() {
    const $q = useQuasar()
    const period = ref('monthly')
    const summary = ref(null)
    const balanceGroupBy = ref('category')
    const balanceData = ref([])
    const balanceChart = ref(null)
    const goalPace = ref([])
    const spendLimitPace = ref([])
    const flexSpend = ref([])
    const mantraBanner = ref(null)
    const groundedLine = ref('')
    const beliefJournal = ref([])
    const journalOpen = ref(false)
    let chartInstance = null

    const formatCurrency = (value) => {
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDay = (dateStr) => {
      if (!dateStr) return '-'
      const [y, m, d] = dateStr.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    // One concrete lever per drifting goal: the required extra monthly savings,
    // pointed at the biggest flexible (non-recurring) spending category
    const coachLine = (g) => {
      if (!g.coach) return ''
      const amt = '$' + formatCurrency(g.coach.requiredExtraPerMonth)
      const base = g.coach.horizonMonths
        ? `Get on pace: save ${amt}/mo more to get there in ${g.coach.horizonMonths} months`
        : `Get back on pace: save ${amt}/mo more to hit your date`
      const flex = flexSpend.value[0]
      return flex
        ? `${base} — biggest flexible spend: ${flex.name} ($${formatCurrency(flex.perMonth)}/mo)`
        : base
    }

    const paceCardClass = (g) => {
      if (g.alreadyMet || g.onTrack === true) return 'bg-green-1'
      if (g.onTrack === false || !g.crossDate) return 'bg-orange-1'
      return ''
    }

    // Worst news first: off pace, then drifting, then on pace, met last
    const paceRank = (g) => {
      if (g.alreadyMet) return 3
      if (!g.crossDate) return 0
      if (g.onTrack === false) return 1
      return 2
    }

    // Spending-limit goals from the same engine call: worst news first, red when the
    // cap is blown, orange when the burn rate says it will be
    const limitRank = (s) => {
      if (s.status === 'over' || s.status === 'ended_over') return 0
      if (s.status === 'hot') return 1
      if (s.status === 'ok') return 2
      return 3
    }

    const limitCardClass = (s) => {
      if (s.status === 'over' || s.status === 'ended_over') return 'bg-red-1'
      if (s.status === 'hot') return 'bg-orange-1'
      return 'bg-green-1'
    }

    const limitRemainingLabel = (s) => s.remaining >= 0
      ? `$${formatCurrency(s.remaining)} left`
      : `over by $${formatCurrency(-s.remaining)}`

    const committing = ref(null)

    // Accept the coach's plan: pin the required extra $/mo (and the top flexible
    // spend category as the lever) onto the goal so the dashboard can hold him to it
    const commitToPlan = async (g) => {
      if (!g.coach) return
      committing.value = g.id
      try {
        const flex = flexSpend.value[0]
        await firebaseApi.setGoalCommitment(g.id, {
          extra_per_month: g.coach.requiredExtraPerMonth,
          category_id: flex?.categoryId || null,
          category_name: flex?.name || null,
          accepted_date: new Date().toISOString().split('T')[0]
        })
        $q.notify({ type: 'positive', message: 'Committed — the dashboard will hold you to it' })
        await loadGoalPace()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to save commitment' })
      } finally {
        committing.value = null
      }
    }

    const dropCommitment = async (g) => {
      try {
        await firebaseApi.setGoalCommitment(g.id, null)
        await loadGoalPace()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to drop commitment' })
      }
    }

    // Belief layer on the landing page: the user's own mantra (rotated daily)
    // headlines the intention card, grounded with one TRUE fact — mirrors
    // Goals.vue's banner but reuses the pace panel's engine call, zero extra fetches
    const updateBeliefBanner = (data) => {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 0)
      const dayOfYear = Math.floor((today - startOfYear) / 864e5)
      const gs = data?.goals || []
      const withMantra = gs.filter(g => g.mantra && g.mantra.trim())
      if (withMantra.length) {
        const g = withMantra[dayOfYear % withMantra.length]
        mantraBanner.value = { text: g.mantra.trim(), goalId: g.id, goalTitle: g.title }
      } else {
        mantraBanner.value = null
      }
      const lines = []
      gs.filter(g => g.alreadyMet).forEach(g => {
        lines.push({ id: g.id, text: `🎉 ${g.title} is fully funded — $${formatCurrency(g.target_amount)} is real, not a wish.` })
      })
      gs.filter(g => g.commitmentStatus && g.commitmentStatus.keptStreak >= 2).forEach(g => {
        lines.push({ id: g.id, text: `You've kept your ${g.title} plan ${g.commitmentStatus.keptStreak} weeks running — belief, backed by action.` })
      })
      gs.filter(g => !g.alreadyMet && g.crossDate && g.onTrack !== false).forEach(g => {
        lines.push({ id: g.id, text: `Your numbers agree: on pace to reach ${g.title} ($${formatCurrency(g.target_amount)}) on ${formatDay(g.crossDate)}.` })
      })
      gs.filter(g => !g.alreadyMet && g.projection && g.projection.daily[0] > 0 && g.target_amount > 0).forEach(g => {
        const cur = g.projection.daily[0]
        const pct = Math.min(99, Math.round((cur / g.target_amount) * 100))
        if (pct >= 5) lines.push({ id: g.id, text: `You've already built $${formatCurrency(cur)} toward ${g.title} — ${pct}% of the way there.` })
      })
      ;(data?.spendLimits || []).filter(l => l.status === 'ok' && l.remaining > 0).forEach(l => {
        lines.push({ id: l.id, text: `Discipline is showing: ${l.category_name} is $${formatCurrency(l.remaining)} under its cap${l.defaultPeriod ? ' this month' : ''}.` })
      })
      gs.filter(g => !g.alreadyMet && g.coach && g.coach.requiredExtraPerMonth > 0).forEach(g => {
        lines.push({ id: g.id, text: `Make it true today: $${formatCurrency(g.coach.requiredExtraPerMonth)}/mo more puts ${g.title} back on track.` })
      })
      if (!lines.length) { groundedLine.value = ''; return }
      // When the banner headlines a personal mantra, prefer a fact about THAT goal
      const preferred = mantraBanner.value ? lines.filter(l => l.id === mantraBanner.value.goalId) : []
      const pool = preferred.length ? preferred : lines
      groundedLine.value = pool[dayOfYear % pool.length].text
      // Journal today's belief + its evidence (fire-and-forget; a same-day
      // rerun just refreshes the fact). Only a personal mantra is journaled —
      // the static tagline isn't a belief; stock-quote days journal from Goals.
      if (mantraBanner.value) {
        firebaseApi.saveBeliefEntry({
          mantra: mantraBanner.value.text,
          personal: true,
          goalId: mantraBanner.value.goalId,
          goalTitle: mantraBanner.value.goalTitle,
          fact: groundedLine.value
        }).then(loadBeliefJournal).catch(err => console.error('Error saving belief entry:', err))
      }
    }

    // Day-by-day belief trail (written by the banner here and on Goals) —
    // full trail in one getDoc; the list shows 14, the stats use it all
    const loadBeliefJournal = async () => {
      try {
        beliefJournal.value = await firebaseApi.getBeliefJournal(3650)
      } catch (err) {
        console.error('Error loading belief journal:', err)
      }
    }
    const journalDate = (day) => {
      const [y, m, d] = day.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    // Weekly belief recap: how many of the last 7 days the journal holds a
    // grounded fact — the numbers backing the words, counted, not claimed.
    const beliefRecap = computed(() => {
      const now = new Date()
      const last7 = new Set()
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        last7.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      }
      const n = beliefJournal.value.filter(e => e.fact && last7.has(e.day)).length
      if (!n) return ''
      return n === 7 ? 'Every day this week, your numbers backed your words'
        : `Your numbers backed your words ${n} of the last 7 days`
    })

    // All-time belief consistency: the weekly recap's long-run counterpart —
    // days the journal holds a grounded fact since the first entry. Hidden
    // until the trail outgrows the recap's 7-day window.
    const beliefAllTime = computed(() => {
      const entries = beliefJournal.value
      if (!entries.length) return ''
      const firstDay = entries[entries.length - 1].day // list is newest-first
      const [y, m, d] = firstDay.split('-').map(Number)
      const start = new Date(y, m - 1, d)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const span = Math.round((today - start) / 864e5) + 1
      if (span <= 7) return ''
      const backed = entries.filter(e => e.fact).length
      return `Since ${journalDate(firstDay)}: your numbers backed your words ${backed} of ${span} days`
    })

    const loadGoalPace = async () => {
      try {
        // Goal crossings are computed over the full 5-year horizon regardless of
        // window, so a minimal window keeps this call cheap
        const today = new Date()
        const startDate = new Date(today.getTime() - 7 * 864e5).toISOString().split('T')[0]
        const endDate = new Date(today.getTime() + 7 * 864e5).toISOString().split('T')[0]
        const data = await firebaseApi.getForecastSeries({ startDate, endDate, grain: 'weekly' })
        goalPace.value = (data?.goals || []).slice().sort((a, b) => paceRank(a) - paceRank(b))
        spendLimitPace.value = (data?.spendLimits || []).slice().sort((a, b) => limitRank(a) - limitRank(b))
        flexSpend.value = data?.meta?.flexSpend || []
        updateBeliefBanner(data)
      } catch (err) {
        // The pace panel is optional on the dashboard — hide it rather than toast
        console.error('Error loading goal pace:', err)
        goalPace.value = []
        spendLimitPace.value = []
        mantraBanner.value = null
        groundedLine.value = ''
      }
    }

    const loadSummary = async () => {
      try {
        summary.value = await firebaseApi.getTransactionSummary(period.value)
      } catch (err) {
        console.error('Error loading summary:', err)
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to load summary',
          caption: 'Check console for index creation link if needed'
        })
      }
    }

    const loadBalanceData = async () => {
      try {
        const data = await firebaseApi.getBalancesByType(balanceGroupBy.value)
        balanceData.value = data || []
        await nextTick()
        renderChart()
      } catch (err) {
        console.error('Error loading balance data:', err)
        // Error message with index link is already logged by firebase-api
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || err.message || 'Failed to load balance data',
          caption: 'Check console for index creation link if needed'
        })
        balanceData.value = []
      }
    }

    const renderChart = () => {
      if (!balanceChart.value) {
        console.warn('Chart canvas not available')
        return
      }
      
      if (!balanceData.value || balanceData.value.length === 0) {
        console.warn('No balance data available')
        return
      }

      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }

      const labels = balanceData.value.map(item => 
        item.account_name || item.group_name || item.type_name || 'Unknown'
      )
      const data = balanceData.value.map(item => Number(item.total_balance))
      
      // Color code: Green for Assets, Red for Debt
      // Check category name or balance to determine color
      const backgroundColors = balanceData.value.map(item => {
        const categoryName = item.category_name_for_color || item.category_name || ''
        const balance = Number(item.total_balance)
        
        // If it's a debt category or negative balance, use red
        if (categoryName.toLowerCase() === 'debt' || balance < 0) {
          return 'rgba(193, 0, 21, 0.8)' // Red
        }
        // If it's an asset category or positive balance, use green
        if (categoryName.toLowerCase() === 'assets' || balance >= 0) {
          return 'rgba(33, 186, 69, 0.8)' // Green
        }
        // Default to gray for uncategorized
        return 'rgba(158, 158, 158, 0.8)' // Gray
      })
      
      const borderColors = backgroundColors.map(color => color.replace('0.8', '1'))

      chartInstance = new Chart(balanceChart.value, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Balance',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: balanceGroupBy.value === 'account' 
                ? 'Balance by Account' 
                : balanceGroupBy.value === 'category' 
                  ? 'Total Balance by Category' 
                  : 'Total Balance by Account Type',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y
                  const sign = value >= 0 ? '' : '-'
                  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                }
              },
              grid: {
                color: function(context) {
                  if (context.tick.value === 0) {
                    return 'rgba(0, 0, 0, 0.5)' // Darker line for zero
                  }
                  return 'rgba(0, 0, 0, 0.1)' // Lighter lines for other grid lines
                },
                lineWidth: function(context) {
                  if (context.tick.value === 0) {
                    return 2 // Thicker line for zero
                  }
                  return 1
                }
              }
            }
          }
        }
      })
    }

    onMounted(async () => {
      await loadSummary()
      // Wait a bit for the canvas to be available
      await nextTick()
      await loadBalanceData()
      loadGoalPace()
      loadBeliefJournal()
    })

    // Watch for period changes
    watch(period, () => {
      loadSummary()
    })

    // Watch for balance group by changes
    watch(balanceGroupBy, () => {
      loadBalanceData()
    })

    return {
      period,
      summary,
      balanceGroupBy,
      balanceData,
      balanceChart,
      goalPace,
      spendLimitPace,
      mantraBanner,
      groundedLine,
      beliefJournal,
      journalOpen,
      journalDate,
      beliefRecap,
      beliefAllTime,
      formatCurrency,
      formatDay,
      coachLine,
      committing,
      commitToPlan,
      dropCommitment,
      paceCardClass,
      limitCardClass,
      limitRemainingLabel,
      loadSummary,
      loadBalanceData
    }
  }
})
</script>

