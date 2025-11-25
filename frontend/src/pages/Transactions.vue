<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Transactions</div>
            
            <q-btn-toggle
              v-model="period"
              toggle-color="primary"
              :options="[
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' }
              ]"
              @update:model-value="loadTransactions"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-md" style="color: #3BA99F; font-weight: 600;">Add Transaction</div>
            
            <q-form @submit="onAddTransaction" class="q-gutter-md">
              <q-input
                v-model="newTransaction.amount"
                label="Amount"
                type="number"
                step="0.01"
                outlined
                :rules="[val => val > 0 || 'Amount must be greater than 0']"
              />

              <q-input
                v-model="newTransaction.date"
                label="Date"
                type="date"
                outlined
                :rules="[val => !!val || 'Date is required']"
              />

              <q-select
                v-model="newTransaction.type"
                :options="['income', 'expense']"
                label="Type"
                outlined
                :rules="[val => !!val || 'Type is required']"
              />

              <q-input
                v-model="newTransaction.description"
                label="Description"
                outlined
              />

              <q-input
                v-model="newTransaction.category"
                label="Category"
                outlined
              />

              <q-select
                v-model="newTransaction.account_id"
                :options="accountOptions"
                option-label="name"
                option-value="id"
                label="Account (optional)"
                outlined
                clearable
                emit-value
                map-options
              />

              <q-btn
                unelevated
                color="primary"
                label="Add Transaction"
                type="submit"
                :loading="adding"
                class="full-width"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="text-h6 q-mb-md" style="color: #3BA99F; font-weight: 600;">Transaction List</div>
            
            <q-list v-if="transactions.length > 0" separator>
              <q-item
                v-for="transaction in transactions"
                :key="transaction.id"
              >
                <q-item-section>
                  <q-item-label>{{ transaction.description || 'No description' }}</q-item-label>
                  <q-item-label caption>
                    {{ formatDate(transaction.date) }}
                    <span v-if="transaction.category_name"> • {{ transaction.category_name }}</span>
                    <span v-if="transaction.account"> • {{ transaction.account.name }}</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label
                    :class="transaction.amount >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    ${{ formatCurrency(Math.abs(transaction.amount)) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="deleteTransaction(transaction.id)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="text-center text-grey q-pa-md">
              No transactions found
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import api from '../services/api'

export default defineComponent({
  name: 'TransactionsPage',
  setup() {
    const $q = useQuasar()
    const period = ref('monthly')
    const transactions = ref([])
    const accounts = ref([])
    const adding = ref(false)
    
    const newTransaction = ref({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: '',
      category: '',
      account_id: null
    })

    const accountOptions = ref([])

    const formatCurrency = (value) => {
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const loadTransactions = async () => {
      try {
        transactions.value = await api.getTransactions({ period: period.value })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load transactions'
        })
      }
    }

    const loadAccounts = async () => {
      try {
        accounts.value = await api.getAccounts()
        accountOptions.value = accounts.value
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load accounts'
        })
      }
    }

    const onAddTransaction = async () => {
      adding.value = true
      try {
        await api.createTransaction({
          ...newTransaction.value,
          amount: parseFloat(newTransaction.value.amount)
        })
        
        $q.notify({
          type: 'positive',
          message: 'Transaction added successfully'
        })
        
        // Reset form
        newTransaction.value = {
          amount: '',
          date: new Date().toISOString().split('T')[0],
          type: 'expense',
          description: '',
          category: '',
          account_id: null
        }
        
        // Reload data
        await loadTransactions()
        await loadAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to add transaction'
        })
      } finally {
        adding.value = false
      }
    }

    const deleteTransaction = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this transaction?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await api.deleteTransaction(id)
          $q.notify({
            type: 'positive',
            message: 'Transaction deleted'
          })
          await loadTransactions()
          await loadAccounts()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: 'Failed to delete transaction'
          })
        }
      })
    }

    onMounted(async () => {
      await loadAccounts()
      await loadTransactions()
    })

    // Watch for period changes
    watch(period, () => {
      loadTransactions()
    })

    return {
      period,
      transactions,
      accounts,
      newTransaction,
      accountOptions,
      adding,
      formatCurrency,
      formatDate,
      loadTransactions,
      onAddTransaction,
      deleteTransaction
    }
  }
})
</script>

