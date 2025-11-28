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
            <!-- Clear and Relearn Categories Section -->
            <q-card flat bordered class="q-mb-md" style="border-left: 4px solid #f44336;">
              <q-card-section>
                <div class="text-h6 q-mb-sm">Clear & Relearn All Categories</div>
                <div class="text-body2 text-grey-7 q-mb-md">
                  Clear all category assignments from all transactions and recategorize them using AI. This will remove all learned mappings and force a fresh categorization.
                </div>
                <q-btn
                  color="negative"
                  label="Clear Categories & Relearn All"
                  icon="refresh"
                  @click="clearAndRelearnAll"
                  :loading="clearingAndRelearning"
                  :disable="clearingAndRelearning"
                />
              </q-card-section>
            </q-card>

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
    const clearingAndRelearning = ref(false)
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

    const clearAndRelearnAll = async () => {
      const confirmed = await $q.dialog({
        title: 'Confirm Clear & Relearn',
        message: 'This will clear all category assignments from ALL transactions and recategorize them. This action cannot be undone. Continue?',
        cancel: true,
        persistent: true,
        ok: {
          color: 'negative',
          label: 'Yes, Clear & Relearn'
        }
      })

      if (!confirmed) {
        return
      }

      clearingAndRelearning.value = true
      results.value = []

      try {
        // Step 1: Clear all categories
        $q.notify({
          type: 'info',
          message: 'Clearing all categories...',
          position: 'top'
        })

        const clearResult = await firebaseApi.clearAllCategories()
        
        $q.notify({
          type: 'positive',
          message: `Cleared categories from ${clearResult.clearedCount} transactions`,
          position: 'top'
        })

        // Step 2: Get all transactions (now uncategorized)
        $q.notify({
          type: 'info',
          message: 'Loading all transactions for recategorization...',
          position: 'top'
        })

        const allTransactions = await firebaseApi.getAllTransactions()
        
        if (allTransactions.length === 0) {
          $q.notify({
            type: 'warning',
            message: 'No transactions found to recategorize',
            position: 'top'
          })
          clearingAndRelearning.value = false
          return
        }

        // Step 3: Categorize all transactions
        $q.notify({
          type: 'info',
          message: `Recategorizing ${allTransactions.length} transactions...`,
          position: 'top'
        })

        const response = await firebaseApi.categorizeTransactionsBatch(allTransactions)
        
        // Process results
        if (response.results && Array.isArray(response.results)) {
          results.value = response.results.map(result => ({
            ...result,
            status: result.category_id ? 'success' : 'no_match'
          }))

          // Update transactions in Firestore
          const { updateDoc, doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('../config/firebase')
          
          let successCount = 0
          let errorCount = 0

          for (const result of response.results) {
            if (result.category_id && result.transaction_id) {
              try {
                // Fetch category name to include in update
                let categoryName = result.category_name || null
                if (!categoryName && result.category_id) {
                  try {
                    const categoryDoc = await getDoc(doc(db, 'categories', result.category_id))
                    if (categoryDoc.exists()) {
                      categoryName = categoryDoc.data().name
                    }
                  } catch (catError) {
                    console.warn(`Could not fetch category name for ${result.category_id}:`, catError)
                  }
                }

                const updateData = {
                  category_id: result.category_id,
                  updated_at: new Date().toISOString()
                }
                
                // Include category_name if we have it
                if (categoryName) {
                  updateData.category_name = categoryName
                }
                
                // Set category_source if AI categorized
                if (result.category_source === 'ai') {
                  updateData.category_source = 'ai'
                  updateData.category_suggested = true
                  updateData.category_confidence = result.confidence || 0.8
                } else if (result.source === 'ai') {
                  // Fallback to source field
                  updateData.category_source = 'ai'
                  updateData.category_suggested = true
                  updateData.category_confidence = result.confidence || 0.8
                }
                
                await updateDoc(doc(db, 'transactions', result.transaction_id), updateData)
                successCount++
              } catch (error) {
                console.error(`Failed to update transaction ${result.transaction_id}:`, error)
                errorCount++
              }
            }
          }

          $q.notify({
            type: successCount > 0 ? 'positive' : 'warning',
            message: `Recategorization complete! ${successCount} transactions updated, ${errorCount} errors`,
            position: 'top',
            timeout: 5000
          })

          // Reload uncategorized transactions
          await loadUncategorized()
        } else {
          throw new Error('Invalid response format from N8N')
        }
      } catch (error) {
        console.error('Error clearing and relearning categories:', error)
        $q.notify({
          type: 'negative',
          message: `Failed to clear and relearn categories: ${error.message}`,
          position: 'top',
          timeout: 5000
        })
      } finally {
        clearingAndRelearning.value = false
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
          const { updateDoc, doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('../config/firebase')
          
          let successCount = 0
          let errorCount = 0

          for (const result of response.results) {
            if (result.category_id && result.transaction_id) {
              try {
                // Fetch category name to include in update
                let categoryName = result.category_name || null
                if (!categoryName && result.category_id) {
                  try {
                    const categoryDoc = await getDoc(doc(db, 'categories', result.category_id))
                    if (categoryDoc.exists()) {
                      categoryName = categoryDoc.data().name
                    }
                  } catch (catError) {
                    console.warn(`Could not fetch category name for ${result.category_id}:`, catError)
                  }
                }

                const updateData = {
                  category_id: result.category_id,
                  updated_at: new Date().toISOString()
                }
                
                // Include category_name if we have it
                if (categoryName) {
                  updateData.category_name = categoryName
                }
                
                // Set category_source if AI categorized
                if (result.category_source === 'ai') {
                  updateData.category_source = 'ai'
                  updateData.category_suggested = true
                  updateData.category_confidence = result.confidence || 0.8
                } else if (result.source === 'ai') {
                  // Fallback to source field
                  updateData.category_source = 'ai'
                  updateData.category_suggested = true
                  updateData.category_confidence = result.confidence || 0.8
                }
                
                await updateDoc(doc(db, 'transactions', result.transaction_id), updateData)
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
      clearingAndRelearning,
      uncategorizedTransactions,
      uncategorizedCount,
      results,
      previewColumns,
      resultColumns,
      loadUncategorized,
      categorizeBatch,
      clearAndRelearnAll
    }
  }
}
</script>

<style scoped>
</style>

