<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Recurring Transactions</div>
          
          <q-tabs
            v-model="selectedFrequency"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify"
            narrow-indicator
          >
            <q-tab name="weekly" label="Weekly" />
            <q-tab name="monthly" label="Monthly" />
            <q-tab name="yearly" label="Yearly" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="selectedFrequency" animated>
            <!-- Weekly Recurring Transactions -->
            <q-tab-panel name="weekly">
              <div class="text-h6 q-mb-md">Weekly Recurring Transactions</div>
              <q-table
                :rows="weeklyTransactions"
                :columns="columns"
                row-key="id"
                flat
                bordered
                :loading="loading"
                :pagination="{ rowsPerPage: 0 }"
                class="recurring-table"
              >
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td>{{ formatDate(props.row.date) }}</q-td>
                    <q-td>{{ props.row.merchant || '-' }}</q-td>
                    <q-td>{{ props.row.description || 'No description' }}</q-td>
                    <q-td>{{ props.row.type }}</q-td>
                    <q-td :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(Math.abs(props.row.amount)) }}
                    </q-td>
                    <q-td>{{ props.row.account_name || '-' }}</q-td>
                    <q-td>
                      <div class="row items-center no-wrap">
                        <q-icon 
                          v-if="getCategoryIcon(props.row.category_id)"
                          :name="getCategoryIcon(props.row.category_id).name"
                          :style="{ color: getCategoryIcon(props.row.category_id).color }"
                          size="18px"
                          class="q-mr-xs"
                        />
                        <span>{{ props.row.category_name || 'Uncategorized' }}</span>
                      </div>
                    </q-td>
                    <q-td>
                      <q-btn
                        flat
                        dense
                        icon="edit"
                        @click="editTransaction(props.row)"
                      />
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteTransaction(props.row.id)"
                      />
                    </q-td>
                  </q-tr>
                </template>
                <template v-slot:no-data>
                  <div class="full-width row justify-center text-grey q-gutter-sm q-pa-lg">
                    <q-icon name="info" size="2em" />
                    <span>No weekly recurring transactions found</span>
                  </div>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- Monthly Recurring Transactions -->
            <q-tab-panel name="monthly">
              <div class="text-h6 q-mb-md">Monthly Recurring Transactions</div>
              <q-table
                :rows="monthlyTransactions"
                :columns="columns"
                row-key="id"
                flat
                bordered
                :loading="loading"
                :pagination="{ rowsPerPage: 0 }"
                class="recurring-table"
              >
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td>{{ formatDate(props.row.date) }}</q-td>
                    <q-td>{{ props.row.merchant || '-' }}</q-td>
                    <q-td>{{ props.row.description || 'No description' }}</q-td>
                    <q-td>{{ props.row.type }}</q-td>
                    <q-td :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(Math.abs(props.row.amount)) }}
                    </q-td>
                    <q-td>{{ props.row.account_name || '-' }}</q-td>
                    <q-td>
                      <div class="row items-center no-wrap">
                        <q-icon 
                          v-if="getCategoryIcon(props.row.category_id)"
                          :name="getCategoryIcon(props.row.category_id).name"
                          :style="{ color: getCategoryIcon(props.row.category_id).color }"
                          size="18px"
                          class="q-mr-xs"
                        />
                        <span>{{ props.row.category_name || 'Uncategorized' }}</span>
                      </div>
                    </q-td>
                    <q-td>
                      <q-btn
                        flat
                        dense
                        icon="edit"
                        @click="editTransaction(props.row)"
                      />
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteTransaction(props.row.id)"
                      />
                    </q-td>
                  </q-tr>
                </template>
                <template v-slot:no-data>
                  <div class="full-width row justify-center text-grey q-gutter-sm q-pa-lg">
                    <q-icon name="info" size="2em" />
                    <span>No monthly recurring transactions found</span>
                  </div>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- Yearly Recurring Transactions -->
            <q-tab-panel name="yearly">
              <div class="text-h6 q-mb-md">Yearly Recurring Transactions</div>
              <q-table
                :rows="yearlyTransactions"
                :columns="columns"
                row-key="id"
                flat
                bordered
                :loading="loading"
                :pagination="{ rowsPerPage: 0 }"
                class="recurring-table"
              >
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td>{{ formatDate(props.row.date) }}</q-td>
                    <q-td>{{ props.row.merchant || '-' }}</q-td>
                    <q-td>{{ props.row.description || 'No description' }}</q-td>
                    <q-td>{{ props.row.type }}</q-td>
                    <q-td :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(Math.abs(props.row.amount)) }}
                    </q-td>
                    <q-td>{{ props.row.account_name || '-' }}</q-td>
                    <q-td>
                      <div class="row items-center no-wrap">
                        <q-icon 
                          v-if="getCategoryIcon(props.row.category_id)"
                          :name="getCategoryIcon(props.row.category_id).name"
                          :style="{ color: getCategoryIcon(props.row.category_id).color }"
                          size="18px"
                          class="q-mr-xs"
                        />
                        <span>{{ props.row.category_name || 'Uncategorized' }}</span>
                      </div>
                    </q-td>
                    <q-td>
                      <q-btn
                        flat
                        dense
                        icon="edit"
                        @click="editTransaction(props.row)"
                      />
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteTransaction(props.row.id)"
                      />
                    </q-td>
                  </q-tr>
                </template>
                <template v-slot:no-data>
                  <div class="full-width row justify-center text-grey q-gutter-sm q-pa-lg">
                    <q-icon name="info" size="2em" />
                    <span>No yearly recurring transactions found</span>
                  </div>
                </template>
              </q-table>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import firebaseApi from '../services/firebase-api'
import { getCategoryIcon } from '../utils/category-icons'

export default defineComponent({
  name: 'RecurringPage',
  setup() {
    const $q = useQuasar()
    const router = useRouter()
    const loading = ref(false)
    const selectedFrequency = ref('weekly')
    const transactions = ref([])
    
    const columns = [
      { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
      { name: 'merchant', label: 'Merchant', field: 'merchant', align: 'left', sortable: true },
      { name: 'description', label: 'Description', field: 'description', align: 'left', sortable: true },
      { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
      { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
      { name: 'account', label: 'Account', field: 'account_name', align: 'left', sortable: true },
      { name: 'category', label: 'Category', field: 'category_name', align: 'left', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]

    const weeklyTransactions = computed(() => {
      return transactions.value
        .filter(t => t.recurring && t.recurring_frequency === 'weekly')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    const monthlyTransactions = computed(() => {
      return transactions.value
        .filter(t => t.recurring && t.recurring_frequency === 'monthly')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    const yearlyTransactions = computed(() => {
      return transactions.value
        .filter(t => t.recurring && t.recurring_frequency === 'yearly')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    }

    const loadTransactions = async () => {
      loading.value = true
      try {
        const allTransactions = await firebaseApi.getTransactions()
        transactions.value = allTransactions.filter(t => t.recurring === true)
        console.log('✅ [Recurring] Loaded recurring transactions:', {
          total: transactions.value.length,
          weekly: weeklyTransactions.value.length,
          monthly: monthlyTransactions.value.length,
          yearly: yearlyTransactions.value.length
        })
      } catch (err) {
        console.error('❌ [Recurring] Failed to load transactions:', err)
        $q.notify({
          type: 'negative',
          message: 'Failed to load recurring transactions'
        })
      } finally {
        loading.value = false
      }
    }

    const editTransaction = (transaction) => {
      router.push({ 
        path: '/transactions',
        query: { edit: transaction.id }
      })
    }

    const deleteTransaction = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this recurring transaction?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteTransaction(id)
          $q.notify({
            type: 'positive',
            message: 'Transaction deleted'
          })
          await loadTransactions()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: 'Failed to delete transaction'
          })
        }
      })
    }

    onMounted(async () => {
      await loadTransactions()
    })

    return {
      loading,
      selectedFrequency,
      transactions,
      columns,
      weeklyTransactions,
      monthlyTransactions,
      yearlyTransactions,
      formatCurrency,
      formatDate,
      getCategoryIcon,
      editTransaction,
      deleteTransaction
    }
  }
})
</script>

<style scoped>
.recurring-table {
  font-size: 14px;
}
</style>

