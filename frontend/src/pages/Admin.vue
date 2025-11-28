<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Admin Tools</div>
            <div class="text-subtitle2 text-grey-7">Diagnostics & Batch Operations</div>
          </q-card-section>

          <q-card-section>
            <!-- Batch Categorization Section -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-h6 q-mb-sm">Batch Transaction Categorization</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  Send all uncategorized transactions to N8N for AI categorization.
                </div>

                <div v-if="uncategorizedCount !== null" class="q-mb-md">
                  <q-badge color="orange" :label="`${uncategorizedCount} uncategorized transactions found`" />
                </div>

                <div class="row q-col-gutter-sm">
                  <q-btn
                    color="primary"
                    label="Load Uncategorized Transactions"
                    icon="refresh"
                    @click="loadUncategorized"
                    :loading="loading"
                  />
                  <q-btn
                    v-if="uncategorizedTransactions.length > 0"
                    color="positive"
                    label="Categorize All"
                    icon="auto_awesome"
                    @click="categorizeBatch"
                    :loading="categorizing"
                    :disable="uncategorizedTransactions.length === 0"
                  />
                </div>
              </q-card-section>
            </q-card>

            <!-- Results Section -->
            <q-card v-if="results.length > 0" flat bordered>
              <q-card-section>
                <div class="text-h6 q-mb-sm">Categorization Results</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  {{ results.length }} transactions processed
                </div>

                <q-table
                  :rows="results"
                  :columns="resultColumns"
                  row-key="transaction_id"
                  :pagination="{ rowsPerPage: 10 }"
                  flat
                  bordered
                >
                  <template v-slot:body-cell-status="props">
                    <q-td :props="props">
                      <q-badge
                        :color="props.value === 'success' ? 'positive' : 'negative'"
                        :label="props.value"
                      />
                    </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>

            <!-- Uncategorized Transactions Preview -->
            <q-card v-if="uncategorizedTransactions.length > 0 && !categorizing" flat bordered class="q-mt-md">
              <q-card-section>
                <div class="text-h6 q-mb-sm">Uncategorized Transactions Preview</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  {{ uncategorizedTransactions.length }} transactions ready to categorize
                </div>

                <q-table
                  :rows="uncategorizedTransactions.slice(0, 10)"
                  :columns="previewColumns"
                  row-key="id"
                  :pagination="{ rowsPerPage: 5 }"
                  flat
                  bordered
                >
                  <template v-slot:body-cell-amount="props">
                    <q-td :props="props" :class="{ 'text-negative': props.value < 0, 'text-positive': props.value > 0 }">
                      ${{ Math.abs(props.value).toFixed(2) }}
                    </q-td>
                  </template>
                </q-table>

                <div v-if="uncategorizedTransactions.length > 10" class="text-caption text-grey-7 q-mt-sm">
                  Showing first 10 of {{ uncategorizedTransactions.length }} transactions
                </div>
              </q-card-section>
            </q-card>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'

export default {
  name: 'AdminPage',
  setup() {
    const $q = useQuasar()
    const loading = ref(false)
    const categorizing = ref(false)
    const uncategorizedTransactions = ref([])
    const uncategorizedCount = ref(null)
    const results = ref([])

    const previewColumns = [
      { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
      { name: 'merchant', label: 'Merchant', field: 'merchant', align: 'left' },
      { name: 'description', label: 'Description', field: 'description', align: 'left' },
      { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
      { name: 'type', label: 'Type', field: 'type', align: 'left' }
    ]

    const resultColumns = [
      { name: 'transaction_id', label: 'Transaction ID', field: 'transaction_id', align: 'left' },
      { name: 'category_name', label: 'Category', field: 'category_name', align: 'left' },
      { name: 'confidence', label: 'Confidence', field: 'confidence', align: 'center', format: val => `${(val * 100).toFixed(0)}%` },
      { name: 'source', label: 'Source', field: 'source', align: 'left' },
      { name: 'status', label: 'Status', field: 'status', align: 'center' }
    ]

    const loadUncategorized = async () => {
      loading.value = true
      results.value = []
      try {
        const transactions = await firebaseApi.getUncategorizedTransactions()
        uncategorizedTransactions.value = transactions
        uncategorizedCount.value = transactions.length
        
        $q.notify({
          type: 'positive',
          message: `Found ${transactions.length} uncategorized transactions`,
          position: 'top'
        })
      } catch (error) {
        console.error('Error loading uncategorized transactions:', error)
        $q.notify({
          type: 'negative',
          message: `Failed to load uncategorized transactions: ${error.message}`,
          position: 'top'
        })
      } finally {
        loading.value = false
      }
    }

    const categorizeBatch = async () => {
      if (uncategorizedTransactions.value.length === 0) {
        $q.notify({
          type: 'warning',
          message: 'No uncategorized transactions to process',
          position: 'top'
        })
        return
      }

      categorizing.value = true
      results.value = []

      try {
        const response = await firebaseApi.categorizeTransactionsBatch(uncategorizedTransactions.value)
        
        // Process results
        if (response.results && Array.isArray(response.results)) {
          results.value = response.results.map(result => ({
            ...result,
            status: result.category_id ? 'success' : 'no_match'
          }))

          // Update transactions in Firestore
          const { updateDoc, doc } = await import('firebase/firestore')
          const { db } = await import('../config/firebase')
          
          let successCount = 0
          let errorCount = 0

          for (const result of response.results) {
            if (result.category_id && result.transaction_id) {
              try {
                await updateDoc(doc(db, 'transactions', result.transaction_id), {
                  category_id: result.category_id,
                  updated_at: new Date().toISOString()
                })
                successCount++
              } catch (error) {
                console.error(`Failed to update transaction ${result.transaction_id}:`, error)
                errorCount++
              }
            }
          }

          $q.notify({
            type: successCount > 0 ? 'positive' : 'warning',
            message: `Processed ${response.results.length} transactions. ${successCount} updated, ${errorCount} errors`,
            position: 'top',
            timeout: 5000
          })

          // Reload uncategorized transactions
          await loadUncategorized()
        } else {
          throw new Error('Invalid response format from N8N')
        }
      } catch (error) {
        console.error('Error categorizing batch:', error)
        $q.notify({
          type: 'negative',
          message: `Failed to categorize transactions: ${error.message}`,
          position: 'top',
          timeout: 5000
        })
      } finally {
        categorizing.value = false
      }
    }

    onMounted(() => {
      loadUncategorized()
    })

    return {
      loading,
      categorizing,
      uncategorizedTransactions,
      uncategorizedCount,
      results,
      previewColumns,
      resultColumns,
      loadUncategorized,
      categorizeBatch
    }
  }
}
</script>

<style scoped>
</style>

