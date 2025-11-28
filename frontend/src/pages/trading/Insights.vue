<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">AI Insights</div>
          
          <div v-if="loading" class="text-center q-pa-lg">
            <q-spinner color="primary" size="3em" />
            <div class="q-mt-md">Analyzing your financial data...</div>
          </div>

          <div v-else>
            <!-- Spending Pattern Analysis -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6 q-mb-sm">
                  <q-icon name="trending_up" class="q-mr-sm" />
                  Spending Patterns
                </div>
                <div v-if="spendingInsights.length === 0" class="text-grey-7">
                  No spending insights available yet. Add more transactions to get personalized recommendations.
                </div>
                <q-list v-else>
                  <q-item v-for="(insight, index) in spendingInsights" :key="index">
                    <q-item-section avatar>
                      <q-icon 
                        :name="insight.type === 'warning' ? 'warning' : 'info'" 
                        :color="insight.type === 'warning' ? 'negative' : 'primary'"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ insight.title }}</q-item-label>
                      <q-item-label caption>{{ insight.description }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn 
                        v-if="insight.action" 
                        flat 
                        dense 
                        :label="insight.actionLabel || 'View'"
                        color="primary"
                        @click="handleAction(insight)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Budget Recommendations -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6 q-mb-sm">
                  <q-icon name="account_balance_wallet" class="q-mr-sm" />
                  Budget Recommendations
                </div>
                <div v-if="budgetRecommendations.length === 0" class="text-grey-7">
                  No budget recommendations available. Set up your budget categories to get suggestions.
                </div>
                <q-list v-else>
                  <q-item v-for="(rec, index) in budgetRecommendations" :key="index">
                    <q-item-section avatar>
                      <q-icon name="lightbulb" color="amber" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ rec.category }}</q-item-label>
                      <q-item-label caption>{{ rec.recommendation }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip :color="rec.status === 'over' ? 'negative' : 'positive'" text-color="white">
                        {{ rec.status === 'over' ? 'Over Budget' : 'On Track' }}
                      </q-chip>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Anomaly Detection -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6 q-mb-sm">
                  <q-icon name="security" class="q-mr-sm" />
                  Anomaly Detection
                </div>
                <div v-if="anomalies.length === 0" class="text-grey-7">
                  <q-icon name="check_circle" color="positive" class="q-mr-sm" />
                  No unusual transactions detected. Your spending looks normal.
                </div>
                <q-list v-else>
                  <q-item v-for="(anomaly, index) in anomalies" :key="index">
                    <q-item-section avatar>
                      <q-icon name="warning" color="negative" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ anomaly.description }}</q-item-label>
                      <q-item-label caption>
                        Amount: ${{ formatCurrency(anomaly.amount) }} on {{ formatDate(anomaly.date) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn 
                        flat 
                        dense 
                        label="Review"
                        color="primary"
                        @click="reviewAnomaly(anomaly)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Savings Opportunities -->
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6 q-mb-sm">
                  <q-icon name="savings" class="q-mr-sm" />
                  Savings Opportunities
                </div>
                <div v-if="savingsOpportunities.length === 0" class="text-grey-7">
                  No savings opportunities identified yet.
                </div>
                <q-list v-else>
                  <q-item v-for="(opp, index) in savingsOpportunities" :key="index">
                    <q-item-section avatar>
                      <q-icon name="attach_money" color="positive" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ opp.title }}</q-item-label>
                      <q-item-label caption>{{ opp.description }}</q-item-label>
                      <q-item-label caption class="text-positive">
                        Potential savings: ${{ formatCurrency(opp.amount) }}/month
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import firebaseApi from '../../services/firebase-api'

export default defineComponent({
  name: 'InsightsPage',
  setup() {
    const $q = useQuasar()
    const router = useRouter()
    const loading = ref(false)
    const spendingInsights = ref([])
    const budgetRecommendations = ref([])
    const anomalies = ref([])
    const savingsOpportunities = ref([])

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    }

    const loadInsights = async () => {
      loading.value = true
      try {
        // Load transactions and analyze
        const transactions = await firebaseApi.getTransactions({ period: 'monthly' })
        const budgets = await firebaseApi.getBudgets()
        const categories = await firebaseApi.getCategories()

        // Analyze spending patterns
        analyzeSpendingPatterns(transactions, categories)
        
        // Generate budget recommendations
        generateBudgetRecommendations(transactions, budgets, categories)
        
        // Detect anomalies
        detectAnomalies(transactions)
        
        // Find savings opportunities
        findSavingsOpportunities(transactions, categories)
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load insights'
        })
      } finally {
        loading.value = false
      }
    }

    const analyzeSpendingPatterns = (transactions, categories) => {
      const insights = []
      const expenses = transactions.filter(t => t.type === 'expense')
      
      if (expenses.length === 0) return

      // Calculate average spending
      const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
      const avgDaily = totalSpending / 30
      
      // Check for high spending days
      const dailySpending = {}
      expenses.forEach(t => {
        const date = t.date
        if (!dailySpending[date]) dailySpending[date] = 0
        dailySpending[date] += Math.abs(parseFloat(t.amount) || 0)
      })
      
      const highSpendingDays = Object.entries(dailySpending)
        .filter(([date, amount]) => amount > avgDaily * 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      if (highSpendingDays.length > 0) {
        insights.push({
          type: 'warning',
          title: 'High Spending Days Detected',
          description: `You spent significantly more than average on ${highSpendingDays.length} day(s). Consider reviewing these transactions.`,
          action: 'view_transactions'
        })
      }

      // Category analysis
      const categorySpending = {}
      expenses.forEach(t => {
        if (t.category_id) {
          const cat = categories.find(c => c.id === t.category_id)
          if (cat) {
            const catName = cat.name
            if (!categorySpending[catName]) categorySpending[catName] = 0
            categorySpending[catName] += Math.abs(parseFloat(t.amount) || 0)
          }
        }
      })

      const topCategory = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])[0]

      if (topCategory) {
        insights.push({
          type: 'info',
          title: `Top Spending Category: ${topCategory[0]}`,
          description: `You've spent $${formatCurrency(topCategory[1])} in this category this month.`,
          action: 'view_category'
        })
      }

      spendingInsights.value = insights
    }

    const generateBudgetRecommendations = (transactions, budgets, categories) => {
      const recommendations = []
      const currentMonth = new Date()
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      budgets.forEach(budget => {
        const category = categories.find(c => c.id === budget.category_id)
        if (!category) return

        const categoryTransactions = transactions.filter(t =>
          t.category_id === budget.category_id &&
          t.type === category.type &&
          new Date(t.date) >= monthStart &&
          new Date(t.date) <= monthEnd
        )

        const actual = categoryTransactions.reduce((sum, t) => 
          sum + Math.abs(parseFloat(t.amount) || 0), 0)
        const budgetAmount = parseFloat(budget.amount) || 0

        if (actual > budgetAmount) {
          recommendations.push({
            category: category.name,
            recommendation: `You've exceeded your budget by $${formatCurrency(actual - budgetAmount)}. Consider reducing spending in this category.`,
            status: 'over',
            amount: actual - budgetAmount
          })
        } else if (actual > budgetAmount * 0.8) {
          recommendations.push({
            category: category.name,
            recommendation: `You're at ${((actual / budgetAmount) * 100).toFixed(0)}% of your budget. You have $${formatCurrency(budgetAmount - actual)} remaining.`,
            status: 'warning',
            amount: budgetAmount - actual
          })
        }
      })

      budgetRecommendations.value = recommendations
    }

    const detectAnomalies = (transactions) => {
      const anomaliesList = []
      const expenses = transactions.filter(t => t.type === 'expense')
      
      if (expenses.length < 5) return // Need enough data

      // Calculate average transaction amount
      const amounts = expenses.map(t => Math.abs(parseFloat(t.amount) || 0))
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
      const stdDev = Math.sqrt(
        amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length
      )

      // Find transactions that are more than 2 standard deviations from mean
      expenses.forEach(t => {
        const amount = Math.abs(parseFloat(t.amount) || 0)
        if (amount > avg + (2 * stdDev)) {
          anomaliesList.push({
            id: t.id,
            description: t.description || 'Unnamed transaction',
            amount: amount,
            date: t.date
          })
        }
      })

      anomalies.value = anomaliesList.slice(0, 5) // Limit to 5
    }

    const findSavingsOpportunities = (transactions, categories) => {
      const opportunities = []
      const expenses = transactions.filter(t => t.type === 'expense')
      
      // Find recurring subscriptions
      const recurring = {}
      expenses.forEach(t => {
        const desc = (t.description || '').toLowerCase()
        if (desc.includes('subscription') || desc.includes('monthly') || desc.includes('annual')) {
          const key = desc.substring(0, 20)
          if (!recurring[key]) recurring[key] = []
          recurring[key].push(t)
        }
      })

      Object.entries(recurring).forEach(([key, trans]) => {
        if (trans.length >= 2) {
          const total = trans.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
          opportunities.push({
            title: 'Recurring Subscription Detected',
            description: `You have a recurring charge of approximately $${formatCurrency(total / trans.length)}/month`,
            amount: total / trans.length
          })
        }
      })

      savingsOpportunities.value = opportunities.slice(0, 3)
    }

    const handleAction = (insight) => {
      if (insight.action === 'view_transactions') {
        router.push('/transactions')
      } else if (insight.action === 'view_category') {
        router.push('/budget')
      }
    }

    const reviewAnomaly = (anomaly) => {
      router.push(`/transactions?highlight=${anomaly.id}`)
    }

    onMounted(() => {
      loadInsights()
    })

    return {
      loading,
      spendingInsights,
      budgetRecommendations,
      anomalies,
      savingsOpportunities,
      formatCurrency,
      formatDate,
      handleAction,
      reviewAnomaly
    }
  }
})
</script>

<style scoped>
.q-card {
  margin-bottom: 16px;
}
</style>


