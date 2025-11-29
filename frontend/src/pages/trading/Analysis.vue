<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Market Analysis</div>
          <div class="text-caption text-grey-7 q-mb-lg">
            Financial news sentiment and market trends
          </div>

          <!-- Market Sentiment -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-sm">
                <q-icon name="trending_up" class="q-mr-sm" />
                Market Sentiment
              </div>
              <div v-if="loading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
              </div>
              <div v-else>
                <div class="row q-gutter-md">
                  <q-card flat bordered class="col-12 col-sm-4">
                    <q-card-section>
                      <div class="text-caption text-grey-7">Overall Sentiment</div>
                      <div class="text-h4" :class="sentiment.overall > 0 ? 'text-positive' : 'text-negative'">
                        {{ sentiment.overall > 0 ? '+' : '' }}{{ sentiment.overall.toFixed(1) }}%
                      </div>
                      <q-linear-progress 
                        :value="Math.abs(sentiment.overall) / 100" 
                        :color="sentiment.overall > 0 ? 'positive' : 'negative'"
                        class="q-mt-sm"
                      />
                    </q-card-section>
                  </q-card>

                  <q-card flat bordered class="col-12 col-sm-4">
                    <q-card-section>
                      <div class="text-caption text-grey-7">Positive News</div>
                      <div class="text-h4 text-positive">{{ sentiment.positive }}%</div>
                    </q-card-section>
                  </q-card>

                  <q-card flat bordered class="col-12 col-sm-4">
                    <q-card-section>
                      <div class="text-caption text-grey-7">Negative News</div>
                      <div class="text-h4 text-negative">{{ sentiment.negative }}%</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Financial News -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-sm">
                <div class="text-h6">
                  <q-icon name="article" class="q-mr-sm" />
                  Recent Financial News
                </div>
                <q-space />
                <q-btn 
                  flat 
                  dense 
                  icon="refresh"
                  label="Refresh"
                  @click="loadNews"
                />
              </div>

              <div v-if="loading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
              </div>

              <div v-else-if="news.length === 0" class="text-center q-pa-lg text-grey-7">
                No financial news available. Configure Finnhub API to enable news feeds.
              </div>

              <q-list v-else>
                <q-item v-for="(item, index) in news" :key="index" clickable>
                  <q-item-section avatar>
                    <q-icon 
                      :name="item.sentiment > 0 ? 'trending_up' : 'trending_down'"
                      :color="item.sentiment > 0 ? 'positive' : 'negative'"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ item.headline }}</q-item-label>
                    <q-item-label caption>
                      {{ item.source }} • {{ formatDate(item.datetime) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip 
                      :color="item.sentiment > 0 ? 'positive' : 'negative'" 
                      text-color="white"
                      size="sm"
                    >
                      {{ item.sentiment > 0 ? 'Positive' : 'Negative' }}
                    </q-chip>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Trend Analysis -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-sm">
                <q-icon name="show_chart" class="q-mb-sm" />
                Spending Trends
              </div>
              <div v-if="trends.length === 0" class="text-center q-pa-lg text-grey-7">
                Not enough data for trend analysis. Add more transactions to see trends.
              </div>
              <div v-else>
                <q-list>
                  <q-item v-for="(trend, index) in trends" :key="index">
                    <q-item-section avatar>
                      <q-icon 
                        :name="trend.direction === 'up' ? 'arrow_upward' : 'arrow_downward'"
                        :color="trend.direction === 'up' ? 'negative' : 'positive'"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ trend.category }}</q-item-label>
                      <q-item-label caption>
                        {{ trend.direction === 'up' ? 'Increased' : 'Decreased' }} by 
                        ${{ formatCurrency(Math.abs(trend.change)) }} 
                        ({{ Math.abs(trend.percentage).toFixed(1) }}%)
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../../services/firebase-api'

export default defineComponent({
  name: 'AnalysisPage',
  setup() {
    const $q = useQuasar()
    const loading = ref(false)
    const sentiment = ref({
      overall: 0,
      positive: 0,
      negative: 0
    })
    const news = ref([])
    const trends = ref([])

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const loadNews = async () => {
      loading.value = true
      try {
        // This would call a Firebase Function that fetches from Finnhub
        // For now, use mock data
        const newsData = await firebaseApi.getFinancialNews()
        news.value = newsData || []
        
        // Calculate sentiment
        if (news.value.length > 0) {
          const positive = news.value.filter(n => n.sentiment > 0).length
          const negative = news.value.filter(n => n.sentiment < 0).length
          const total = news.value.length
          
          sentiment.value = {
            overall: ((positive - negative) / total) * 100,
            positive: (positive / total) * 100,
            negative: (negative / total) * 100
          }
        }
      } catch (err) {
        console.error('Failed to load news:', err)
        // Use mock data for demo
        news.value = []
      } finally {
        loading.value = false
      }
    }

    const loadTrends = async () => {
      try {
        // Get transactions for last 2 months
        const transactions = await firebaseApi.getTransactions({ period: 'monthly' })
        const categories = await firebaseApi.getCategories()
        
        // Compare this month vs last month
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        const thisMonthExpenses = transactions.filter(t => 
          t.type === 'expense' && 
          new Date(t.date) >= thisMonth
        )
        
        const lastMonthExpenses = transactions.filter(t => 
          t.type === 'expense' && 
          new Date(t.date) >= lastMonth &&
          new Date(t.date) <= lastMonthEnd
        )

        // Calculate category spending
        const categorySpending = {}
        
        thisMonthExpenses.forEach(t => {
          if (t.category_id) {
            const cat = categories.find(c => c.id === t.category_id)
            if (cat) {
              if (!categorySpending[cat.name]) {
                categorySpending[cat.name] = { thisMonth: 0, lastMonth: 0 }
              }
              categorySpending[cat.name].thisMonth += Math.abs(parseFloat(t.amount) || 0)
            }
          }
        })

        lastMonthExpenses.forEach(t => {
          if (t.category_id) {
            const cat = categories.find(c => c.id === t.category_id)
            if (cat && categorySpending[cat.name]) {
              categorySpending[cat.name].lastMonth += Math.abs(parseFloat(t.amount) || 0)
            }
          }
        })

        // Calculate trends
        trends.value = Object.entries(categorySpending)
          .map(([category, amounts]) => {
            const change = amounts.thisMonth - amounts.lastMonth
            const percentage = amounts.lastMonth > 0 
              ? (change / amounts.lastMonth) * 100 
              : 0
            
            return {
              category,
              change,
              percentage,
              direction: change > 0 ? 'up' : 'down'
            }
          })
          .filter(t => Math.abs(t.change) > 10) // Only show significant changes
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .slice(0, 5)
      } catch (err) {
        console.error('Failed to load trends:', err)
      }
    }

    onMounted(() => {
      loadNews()
      loadTrends()
    })

    return {
      loading,
      sentiment,
      news,
      trends,
      formatCurrency,
      formatDate,
      loadNews
    }
  }
})
</script>

<style scoped>
.q-card {
  margin-bottom: 16px;
}
</style>



