<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
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
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue'
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
    let chartInstance = null

    const formatCurrency = (value) => {
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const loadSummary = async () => {
      try {
        summary.value = await firebaseApi.getTransactionSummary(period.value)
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load summary'
        })
      }
    }

    const loadBalanceData = async () => {
      try {
        const data = await api.getBalancesByType(balanceGroupBy.value)
        balanceData.value = data || []
        await nextTick()
        renderChart()
      } catch (err) {
        console.error('Error loading balance data:', err)
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || err.message || 'Failed to load balance data'
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
      formatCurrency,
      loadSummary,
      loadBalanceData
    }
  }
})
</script>

