<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Balance Forecast</div>
            <p class="text-body2 text-grey-7 q-mb-md">Projected balance over time based on recent spend trends. "Now" is at the center; time runs left (past) to right (future).</p>

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
                    <div class="text-caption text-grey-7">Avg daily net (last 30 days)</div>
                    <div class="text-h6" :class="summaryCards.avgDailyNet >= 0 ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(summaryCards.avgDailyNet) }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
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
    let chartInstance = null

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
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

        const accounts = await firebaseApi.getAccounts()
        const active = accounts.filter(a => !a.is_closed)
        const totalBalance = active.reduce((sum, a) => sum + (a.balance_current || 0), 0)
        const daysBack = 30
        const start30 = new Date()
        start30.setDate(start30.getDate() - daysBack)
        const start30Str = start30.toISOString().split('T')[0]
        const todayStr = new Date().toISOString().split('T')[0]
        const recent = await firebaseApi.getTransactionsByDateRange(start30Str, todayStr)
        let totalNet = 0
        recent.forEach(t => {
          const amt = parseFloat(t.amount) || 0
          totalNet += t.type === 'income' ? amt : -amt
        })
        summaryCards.value = {
          totalBalance,
          avgDailyNet: totalNet / daysBack
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

      const { labels, nowIndex, series, totalValues } = forecastData.value
      const datasets = []

      if (totalValues && totalValues.length) {
        datasets.push({
          label: 'Total',
          data: totalValues,
          borderColor: '#3BA99F',
          backgroundColor: 'rgba(59, 169, 159, 0.1)',
          fill: true,
          borderWidth: 2,
          pointRadius: 4
        })
      }

      series.forEach((s, i) => {
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
        }]
      })
    }

    onMounted(() => {
      loadForecastSeries()
    })

    watch(rangePreset, () => {
      if (forecastData.value) loadForecastSeries()
    })

    return {
      rangePreset,
      loading,
      error,
      forecastData,
      summaryCards,
      forecastChart,
      formatCurrency,
      loadForecastSeries
    }
  }
})
</script>
