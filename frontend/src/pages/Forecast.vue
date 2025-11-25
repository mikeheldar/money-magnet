<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">Balance Forecast</div>
          </q-card-section>

          <q-card-section v-if="currentMonth">
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-card class="bg-primary text-white">
                  <q-card-section>
                    <div class="text-h6">Current Balance</div>
                    <div class="text-h4">${{ formatCurrency(currentMonth.currentBalance) }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card class="bg-positive text-white">
                  <q-card-section>
                    <div class="text-h6">This Month Income</div>
                    <div class="text-h4">${{ formatCurrency(currentMonth.currentMonth.income) }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-4">
                <q-card class="bg-negative text-white">
                  <q-card-section>
                    <div class="text-h6">This Month Expenses</div>
                    <div class="text-h4">${{ formatCurrency(currentMonth.currentMonth.expense) }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Select Future Date</div>
                    <q-input
                      v-model="targetDate"
                      label="Target Date"
                      type="date"
                      outlined
                      :min="minDate"
                      @update:model-value="loadForecast"
                    />
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6" v-if="forecast">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Projected Balance</div>
                    <div class="text-h3 q-mb-sm" :class="forecast.projectedBalance >= 0 ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(forecast.projectedBalance) }}
                    </div>
                    <div class="text-body2 text-grey">
                      <div v-if="forecast.projectedIncome > 0">
                        Projected Income: ${{ formatCurrency(forecast.projectedIncome) }}
                      </div>
                      <div v-if="forecast.projectedExpense > 0">
                        Projected Expenses: ${{ formatCurrency(forecast.projectedExpense) }}
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-md" v-if="currentMonth.currentMonth">
              <div class="col-12">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">Current Month Statistics</div>
                    <div class="row q-col-gutter-md">
                      <div class="col-12 col-md-4">
                        <div class="text-body2 text-grey">Days Remaining</div>
                        <div class="text-h6">{{ currentMonth.currentMonth.daysRemaining }}</div>
                      </div>
                      <div class="col-12 col-md-4">
                        <div class="text-body2 text-grey">Avg Daily Income</div>
                        <div class="text-h6">${{ formatCurrency(currentMonth.currentMonth.avgDailyIncome) }}</div>
                      </div>
                      <div class="col-12 col-md-4">
                        <div class="text-body2 text-grey">Avg Daily Expense</div>
                        <div class="text-h6">${{ formatCurrency(currentMonth.currentMonth.avgDailyExpense) }}</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'

export default defineComponent({
  name: 'ForecastPage',
  setup() {
    const $q = useQuasar()
    const currentMonth = ref(null)
    const forecast = ref(null)
    const targetDate = ref('')

    const minDate = computed(() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    })

    const formatCurrency = (value) => {
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const loadCurrentMonth = async () => {
      try {
        const today = new Date()
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const result = await firebaseApi.getForecast(nextMonth.toISOString().split('T')[0])
        currentMonth.value = result
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load current month data'
        })
      }
    }

    const loadForecast = async () => {
      if (!targetDate.value) {
        forecast.value = null
        return
      }

      try {
        forecast.value = await firebaseApi.getForecast(targetDate.value)
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to load forecast'
        })
      }
    }

    onMounted(async () => {
      await loadCurrentMonth()
    })

    return {
      currentMonth,
      forecast,
      targetDate,
      minDate,
      formatCurrency,
      loadForecast
    }
  }
})
</script>

