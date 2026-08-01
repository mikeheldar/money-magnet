<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Balance Forecast</div>
            <p class="text-body2 text-grey-7 q-mb-md">Your money's road: real balances in the past, and ahead each recurring bill and paycheck lands on its scheduled date while day-to-day spend flows at your recent baseline. "Now" is at the center.</p>

            <div v-if="summaryCards" class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Current total balance</div>
                    <div class="text-h6">${{ formatCurrency(summaryCards.totalBalance) }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Baseline daily net (last {{ summaryCards.observedDays }}d, excl. recurring)</div>
                    <div class="text-h6" :class="summaryCards.baselineDailyNet >= 0 ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(summaryCards.baselineDailyNet) }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Recurring bills/income modeled</div>
                    <div class="text-h6">{{ summaryCards.recurringCount }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div v-if="goalOptions.length" class="q-mb-md">
              <q-card flat bordered :class="goalCardClass">
                <q-card-section class="q-py-sm">
                  <div class="row items-center q-col-gutter-md">
                    <div class="col-12 col-md-4">
                      <q-select
                        v-model="selectedGoalId"
                        :options="goalOptions"
                        emit-value
                        map-options
                        dense
                        outlined
                        label="Goal to track"
                        bg-color="white"
                      />
                    </div>
                    <div v-if="selectedGoal" class="col-12 col-md-8">
                      <template v-if="selectedGoal.alreadyMet">
                        <span class="text-subtitle1 text-positive text-weight-medium">
                          🎉 Already at ${{ formatCurrency(selectedGoal.target_amount) }}
                        </span>
                      </template>
                      <template v-else-if="selectedGoal.crossDate">
                        <span class="text-subtitle1 text-weight-medium">
                          On pace to reach ${{ formatCurrency(selectedGoal.target_amount) }} on
                          <span style="color: #3BA99F;">{{ formatDay(selectedGoal.crossDate) }}</span>
                        </span>
                        <q-chip
                          v-if="selectedGoal.onTrack === true"
                          dense color="positive" text-color="white" size="sm" class="q-ml-sm"
                        >On track for {{ formatDay(selectedGoal.target_date) }}</q-chip>
                        <q-chip
                          v-else-if="selectedGoal.onTrack === false"
                          dense color="orange" text-color="white" size="sm" class="q-ml-sm"
                        >Drifting — target was {{ formatDay(selectedGoal.target_date) }}</q-chip>
                      </template>
                      <template v-else>
                        <span class="text-subtitle1 text-negative text-weight-medium">
                          Not on pace to reach ${{ formatCurrency(selectedGoal.target_amount) }} within 5 years at current pace
                        </span>
                      </template>
                      <div v-if="selectedGoal.coach" class="text-caption text-grey-8 q-mt-xs">{{ coachLine(selectedGoal) }}</div>
                      <div v-if="selectedGoal.coach && !selectedGoal.commitment" class="q-mt-xs">
                        <q-btn
                          dense flat no-caps size="sm" color="primary"
                          :label="'Commit: save $' + formatCurrency(selectedGoal.coach.requiredExtraPerMonth) + '/mo'"
                          :loading="committing === selectedGoal.id"
                          @click="commitToPlan(selectedGoal)"
                        />
                      </div>
                      <div v-if="!selectedGoal.alreadyMet && selectedGoal.projection" class="q-mt-sm">
                        <div class="text-caption text-weight-medium" style="color: #3BA99F;">What if you saved more each month?</div>
                        <div class="row items-center q-col-gutter-md">
                          <div class="col-8 col-md-5">
                            <q-slider
                              v-model="whatIfExtra"
                              :min="0"
                              :max="whatIfMax"
                              :step="25"
                              label
                              :label-value="'+$' + whatIfExtra + '/mo'"
                              color="primary"
                              dense
                            />
                          </div>
                          <div class="col-12 col-md-7 text-caption">
                            <template v-if="whatIfInfo">
                              <span v-if="whatIfInfo.crossDate">
                                +${{ whatIfExtra }}/mo &rarr; reach it
                                <b style="color: #3BA99F;">{{ formatDay(whatIfInfo.crossDate) }}</b>
                                <span v-if="whatIfInfo.sooner" class="text-green-8"> ({{ whatIfInfo.sooner }} sooner)</span>
                              </span>
                              <span v-else class="text-grey-7">+${{ whatIfExtra }}/mo still doesn't get there within 5 years</span>
                              <q-btn
                                v-if="!selectedGoal.commitment && whatIfInfo.crossDate"
                                dense flat no-caps size="sm" color="primary" class="q-ml-sm"
                                :label="'Commit this plan'"
                                :loading="committing === selectedGoal.id"
                                @click="commitWhatIf(selectedGoal)"
                              />
                            </template>
                            <span v-else class="text-grey-6">Drag to see the date move</span>
                          </div>
                        </div>
                      </div>
                      <div v-if="selectedGoal.commitment && !selectedGoal.alreadyMet" class="text-caption q-mt-xs">
                        <div class="text-grey-8">
                          Committed {{ formatDay(selectedGoal.commitment.accepted_date) }}: save
                          ${{ formatCurrency(selectedGoal.commitment.extra_per_month) }}/mo more<template v-if="selectedGoal.commitment.category_name"> from {{ selectedGoal.commitment.category_name }}</template>
                          <q-btn dense flat round size="xs" icon="close" color="grey" @click="dropCommitment(selectedGoal)">
                            <q-tooltip>Drop this commitment</q-tooltip>
                          </q-btn>
                        </div>
                        <div v-if="selectedGoal.commitmentStatus">
                          {{ selectedGoal.commitment.category_name }}: ${{ formatCurrency(selectedGoal.commitmentStatus.mtdSpend) }} spent of
                          ${{ formatCurrency(selectedGoal.commitmentStatus.allowance) }} this month
                          <q-chip dense size="sm" :color="selectedGoal.commitmentStatus.onPace ? 'green' : 'orange'" text-color="white">
                            {{ selectedGoal.commitmentStatus.onPace ? 'Keeping it' : 'Over pace' }}
                          </q-chip>
                          <div v-if="selectedGoal.commitmentStatus.weeks && selectedGoal.commitmentStatus.weeks.length" class="q-mt-xs">
                            <q-icon
                              v-for="w in selectedGoal.commitmentStatus.weeks" :key="w.start"
                              :name="w.kept ? 'check_circle' : 'cancel'"
                              :color="w.kept ? 'green' : 'orange'"
                              size="14px" class="q-mr-xs"
                            >
                              <q-tooltip>Week of {{ formatDay(w.start) }}: ${{ formatCurrency(w.spent) }} of ${{ formatCurrency(w.allowance) }}</q-tooltip>
                            </q-icon>
                            <span v-if="selectedGoal.commitmentStatus.keptStreak >= 2" class="text-green-8" style="font-weight: 600;">
                              {{ selectedGoal.commitmentStatus.keptStreak }}-week streak &mdash; keep it going
                            </span>
                            <span v-else-if="selectedGoal.commitmentStatus.brokenStreak >= 2" class="text-orange-9" style="font-weight: 600;">
                              Over pace {{ selectedGoal.commitmentStatus.brokenStreak }} weeks running &mdash; tighten {{ selectedGoal.commitment.category_name }} or adjust the plan
                            </span>
                          </div>
                        </div>
                      </div>
                      <div v-if="selectedGoal.linked_account_id" class="text-caption text-grey-7">
                        Tracked against its linked account's balance
                      </div>
                      <div v-else class="text-caption text-grey-7">
                        Tracked against total balance across all accounts
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="q-mb-md">
              <span class="text-subtitle2 q-mr-sm">Range:</span>
              <q-btn-toggle
                v-model="rangePreset"
                toggle-color="primary"
                dense
                :options="[
                  { label: '1 week', value: '1week' },
                  { label: '2 weeks', value: '2weeks' },
                  { label: '1 month', value: '1month' },
                  { label: '3 months', value: '3months' }
                ]"
                @update:model-value="loadForecastSeries"
              />
            </div>

            <div v-if="forecastData && forecastData.series.length" class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Accounts to show</div>
              <div class="row q-col-gutter-sm">
                <q-checkbox
                  v-for="s in forecastData.series"
                  :key="s.accountId"
                  v-model="selectedAccountIds"
                  :val="s.accountId"
                  :label="s.accountName"
                  color="primary"
                  dense
                  @update:model-value="renderChart"
                />
              </div>
              <q-btn flat dense size="sm" label="Select all" class="q-mt-xs" @click="selectAllAccounts" />
              <q-btn flat dense size="sm" label="Clear all" class="q-mt-xs q-ml-xs" @click="clearAllAccounts" />
            </div>

            <div v-if="loading" class="row justify-center q-pa-lg">
              <q-spinner-dots color="primary" size="40px" />
            </div>

            <div v-else-if="forecastData" style="position: relative; height: 400px;">
              <canvas ref="forecastChart"></canvas>
            </div>

            <div v-else-if="error" class="text-center text-negative q-pa-md">
              {{ error }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, watch, nextTick, computed } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
)

const RANGE_PRESETS = {
  '1week': { pastDays: 4, futureDays: 7 },
  '2weeks': { pastDays: 7, futureDays: 14 },
  '1month': { pastDays: 15, futureDays: 30 },
  '3months': { pastDays: 45, futureDays: 90 }
}

const COLORS = [
  '#3BA99F',
  '#2196F3',
  '#9C27B0',
  '#FF9800',
  '#4CAF50',
  '#F44336',
  '#00BCD4',
  '#795548'
]

const GOAL_COLOR = '#FF9800'

export default defineComponent({
  name: 'ForecastPage',
  setup() {
    const $q = useQuasar()
    const rangePreset = ref('1week')
    const loading = ref(true)
    const error = ref(null)
    const forecastData = ref(null)
    const summaryCards = ref(null)
    const forecastChart = ref(null)
    const selectedAccountIds = ref([])
    const selectedGoalId = ref(null)
    const flexSpend = ref([])
    const committing = ref(null)
    let chartInstance = null

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
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

    const goalOptions = computed(() => {
      return (forecastData.value?.goals || []).map(g => ({
        label: `${g.title} — $${formatCurrency(g.target_amount)}`,
        value: g.id
      }))
    })

    const selectedGoal = computed(() => {
      return (forecastData.value?.goals || []).find(g => g.id === selectedGoalId.value) || null
    })

    const goalCardClass = computed(() => {
      const g = selectedGoal.value
      if (!g) return 'bg-grey-1'
      if (g.alreadyMet || g.onTrack === true) return 'bg-green-1'
      if (g.onTrack === false || !g.crossDate) return 'bg-orange-1'
      return 'bg-grey-1'
    })

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

    // Accept the coach's plan: pin the required extra $/mo (and the top flexible
    // spend category as the lever) onto the goal so the forecast can hold him to it
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
        $q.notify({ type: 'positive', message: 'Committed — the forecast will hold you to it' })
        await loadForecastSeries()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to save commitment' })
      } finally {
        committing.value = null
      }
    }

    const dropCommitment = async (g) => {
      try {
        await firebaseApi.setGoalCommitment(g.id, null)
        await loadForecastSeries()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to drop commitment' })
      }
    }

    // What-if reroute: slide "save an extra $X/mo" and watch the crossing date move.
    // Crossing math runs on the goal's returned daily trajectory - no engine refetch.
    const whatIfExtra = ref(0)

    const whatIfMax = computed(() => {
      const g = selectedGoal.value
      const coachAmt = g?.coach?.requiredExtraPerMonth || 0
      return Math.max(500, Math.ceil((coachAmt * 2) / 50) * 50)
    })

    const dayFromStart = (startStr, n) => {
      const [y, m, d] = startStr.split('-').map(Number)
      const out = new Date(y, m - 1, d + n)
      const mm = String(out.getMonth() + 1).padStart(2, '0')
      const dd = String(out.getDate()).padStart(2, '0')
      return `${out.getFullYear()}-${mm}-${dd}`
    }

    const humanDelta = (days) => {
      if (days >= 60) return `~${Math.round(days / 30.44)} months`
      if (days >= 14) return `${Math.round(days / 7)} weeks`
      if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`
      return null
    }

    const whatIfInfo = computed(() => {
      const g = selectedGoal.value
      if (!g || g.alreadyMet || !g.projection || !whatIfExtra.value) return null
      const perDay = whatIfExtra.value / 30.44
      const daily = g.projection.daily
      let crossIdx = null
      for (let i = 1; i < daily.length; i++) {
        if (daily[i] + perDay * i >= g.target_amount) {
          crossIdx = i
          break
        }
      }
      if (crossIdx === null) return { crossDate: null, sooner: null, perDay }
      const crossDate = dayFromStart(g.projection.start, crossIdx)
      let sooner = null
      if (g.crossDate && crossDate < g.crossDate) {
        const diff = Math.round((Date.parse(g.crossDate) - Date.parse(crossDate)) / 864e5)
        sooner = humanDelta(diff)
      }
      return { crossDate, sooner, perDay }
    })

    // Pin the explored what-if amount as the commitment (same shape as the coach plan)
    const commitWhatIf = async (g) => {
      if (!whatIfExtra.value) return
      committing.value = g.id
      try {
        const flex = flexSpend.value[0]
        await firebaseApi.setGoalCommitment(g.id, {
          extra_per_month: whatIfExtra.value,
          category_id: flex?.categoryId || null,
          category_name: flex?.name || null,
          accepted_date: new Date().toISOString().split('T')[0]
        })
        $q.notify({ type: 'positive', message: 'Committed - the forecast will hold you to it' })
        await loadForecastSeries()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to save commitment' })
      } finally {
        committing.value = null
      }
    }

    function getDateRange() {
      const today = new Date()
      const preset = RANGE_PRESETS[rangePreset.value] || RANGE_PRESETS['1week']
      const start = new Date(today)
      start.setDate(start.getDate() - preset.pastDays)
      const end = new Date(today)
      end.setDate(end.getDate() + preset.futureDays)
      const totalDays = preset.pastDays + preset.futureDays
      let grain = 'weekly'
      if (totalDays <= 14) grain = 'daily'
      else if (totalDays <= 60) grain = 'weekly'
      else grain = 'monthly'
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        grain
      }
    }

    const loadForecastSeries = async () => {
      loading.value = true
      error.value = null
      try {
        const { startDate, endDate, grain } = getDateRange()
        const data = await firebaseApi.getForecastSeries({ startDate, endDate, grain })
        forecastData.value = data
        flexSpend.value = data.meta?.flexSpend || []
        if (data.series && data.series.length && selectedAccountIds.value.length === 0) {
          selectedAccountIds.value = data.series.map(s => s.accountId)
        }

        const goals = data.goals || []
        if (!goals.find(g => g.id === selectedGoalId.value)) {
          const inFlight = goals.find(g => g.crossDate && !g.alreadyMet)
          selectedGoalId.value = (inFlight || goals[0])?.id || null
        }

        const accounts = await firebaseApi.getAccounts()
        const active = accounts.filter(a => !a.is_closed)
        summaryCards.value = {
          totalBalance: active.reduce((sum, a) => sum + (a.balance_current || 0), 0),
          baselineDailyNet: data.meta?.baselineDailyNet ?? 0,
          observedDays: data.meta?.observedDays ?? 90,
          recurringCount: data.meta?.recurringCount ?? 0
        }

        await nextTick()
        renderChart()
      } catch (err) {
        error.value = err.message || 'Failed to load forecast'
        $q.notify({ type: 'negative', message: error.value })
        forecastData.value = null
      } finally {
        loading.value = false
      }
    }

    const renderChart = () => {
      if (!forecastChart.value || !forecastData.value) return

      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }

      const { labels, nowIndex, series, bucketDates } = forecastData.value
      const selected = selectedAccountIds.value
      const hasSelection = selected.length > 0
      const filteredSeries = hasSelection
        ? series.filter(s => selected.includes(s.accountId))
        : []

      const datasets = []

      if (hasSelection && filteredSeries.length > 0 && filteredSeries[0].values.length) {
        const totalSelected = filteredSeries[0].values.map((_, i) =>
          filteredSeries.reduce((sum, s) => sum + (s.values[i] || 0), 0)
        )
        datasets.push({
          label: 'Total (selected)',
          data: totalSelected,
          borderColor: '#3BA99F',
          backgroundColor: 'rgba(59, 169, 159, 0.1)',
          fill: true,
          borderWidth: 2,
          pointRadius: 4
        })
      }

      filteredSeries.forEach((s, i) => {
        datasets.push({
          label: s.accountName,
          data: s.values,
          borderColor: COLORS[(i + 1) % COLORS.length],
          backgroundColor: 'transparent',
          fill: false,
          borderWidth: 2,
          pointRadius: 3
        })
      })

      // What-if reroute line: the tracked balance with the slider's extra $/mo applied,
      // dashed, future-only (past buckets are null so the line starts at "now")
      const wi = whatIfInfo.value
      const wiGoal = selectedGoal.value
      if (wi && wiGoal && wiGoal.projection) {
        const start = wiGoal.projection.start
        const daily = wiGoal.projection.daily
        const startMs = Date.parse(start)
        const rerouteData = bucketDates.map(ds => {
          const i = Math.round((Date.parse(ds) - startMs) / 864e5)
          if (i < 0 || i >= daily.length) return null
          return Math.round((daily[i] + wi.perDay * i) * 100) / 100
        })
        if (rerouteData.some(v => v !== null)) {
          datasets.push({
            label: `What-if (+$${whatIfExtra.value}/mo)`,
            data: rerouteData,
            borderColor: '#9C27B0',
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0
          })
        }
      }

      // Goal overlay: horizontal target line (only when the target is near the plotted
      // range, so it doesn't flatten the chart) + vertical marker at the crossing bucket
      const goal = selectedGoal.value
      let goalLineY = null
      let crossBucketIdx = null
      let suggestedMax
      if (goal) {
        const maxVal = Math.max(...datasets.flatMap(ds => ds.data), 0)
        if (goal.target_amount <= maxVal * 1.6) {
          goalLineY = goal.target_amount
          if (goal.target_amount > maxVal) suggestedMax = goal.target_amount * 1.05
        }
        if (goal.crossDate && bucketDates && goal.crossDate <= bucketDates[bucketDates.length - 1]) {
          const idx = bucketDates.findIndex(s => s >= goal.crossDate)
          if (idx >= 0) crossBucketIdx = idx
        }
      }

      chartInstance = new Chart(forecastChart.value, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: true, position: 'top' },
            title: {
              display: true,
              text: 'Projected balance (now at center)'
            },
            tooltip: {
              callbacks: {
                label (context) {
                  const v = context.parsed.y
                  return `${context.dataset.label}: $${formatCurrency(v)}`
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: (ctx) => {
                  if (ctx.tick && forecastData.value && ctx.tick.value === nowIndex) {
                    return 'rgba(59, 169, 159, 0.5)'
                  }
                  return 'rgba(0,0,0,0.05)'
                },
                lineWidth: (ctx) => {
                  if (ctx.tick && forecastData.value && ctx.tick.value === nowIndex) return 2
                  return 1
                }
              }
            },
            y: {
              beginAtZero: false,
              suggestedMax,
              ticks: {
                callback (value) {
                  return '$' + Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
                }
              }
            }
          }
        },
        plugins: [{
          id: 'nowLine',
          afterDraw (chart) {
            const { ctx, chartArea, scales } = chart
            if (!chartArea || !forecastData.value) return
            const idx = forecastData.value.nowIndex
            const xScale = scales.x
            if (!xScale) return
            const x = xScale.getPixelForValue(idx)
            if (x < chartArea.left || x > chartArea.right) return
            ctx.save()
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(59, 169, 159, 0.7)'
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.moveTo(x, chartArea.top)
            ctx.lineTo(x, chartArea.bottom)
            ctx.stroke()
            ctx.restore()
          }
        }, {
          id: 'goalOverlay',
          afterDraw (chart) {
            const { ctx, chartArea, scales } = chart
            if (!chartArea || (goalLineY === null && crossBucketIdx === null)) return

            if (goalLineY !== null && scales.y) {
              const y = scales.y.getPixelForValue(goalLineY)
              if (y >= chartArea.top && y <= chartArea.bottom) {
                ctx.save()
                ctx.beginPath()
                ctx.strokeStyle = GOAL_COLOR
                ctx.lineWidth = 2
                ctx.setLineDash([8, 4])
                ctx.moveTo(chartArea.left, y)
                ctx.lineTo(chartArea.right, y)
                ctx.stroke()
                ctx.font = '600 11px sans-serif'
                ctx.fillStyle = GOAL_COLOR
                ctx.textAlign = 'right'
                ctx.fillText(goal ? goal.title : 'Goal', chartArea.right - 6, y - 5)
                ctx.restore()
              }
            }

            if (crossBucketIdx !== null && scales.x) {
              const x = scales.x.getPixelForValue(crossBucketIdx)
              if (x >= chartArea.left && x <= chartArea.right) {
                ctx.save()
                ctx.beginPath()
                ctx.strokeStyle = GOAL_COLOR
                ctx.lineWidth = 2
                ctx.setLineDash([2, 3])
                ctx.moveTo(x, chartArea.top)
                ctx.lineTo(x, chartArea.bottom)
                ctx.stroke()
                ctx.restore()
              }
            }
          }
        }]
      })
    }

    onMounted(() => {
      loadForecastSeries()
    })

    const selectAllAccounts = () => {
      if (forecastData.value && forecastData.value.series) {
        selectedAccountIds.value = forecastData.value.series.map(s => s.accountId)
        renderChart()
      }
    }

    const clearAllAccounts = () => {
      selectedAccountIds.value = []
      renderChart()
    }

    watch(rangePreset, () => {
      if (forecastData.value) loadForecastSeries()
    })

    watch(selectedAccountIds, () => {
      if (forecastData.value && chartInstance) renderChart()
    }, { deep: true })

    watch(selectedGoalId, () => {
      whatIfExtra.value = 0
      if (forecastData.value && chartInstance) renderChart()
    })

    let whatIfTimer = null
    watch(whatIfExtra, () => {
      if (!forecastData.value || !chartInstance) return
      clearTimeout(whatIfTimer)
      whatIfTimer = setTimeout(renderChart, 150)
    })

    return {
      rangePreset,
      loading,
      error,
      forecastData,
      summaryCards,
      forecastChart,
      selectedAccountIds,
      selectedGoalId,
      goalOptions,
      selectedGoal,
      goalCardClass,
      coachLine,
      committing,
      commitToPlan,
      dropCommitment,
      whatIfExtra,
      whatIfMax,
      whatIfInfo,
      commitWhatIf,
      formatCurrency,
      formatDay,
      loadForecastSeries,
      selectAllAccounts,
      clearAllAccounts,
      renderChart
    }
  }
})
</script>
