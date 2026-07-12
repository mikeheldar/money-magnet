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
      if (forecastData.value && chartInstance) renderChart()
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
