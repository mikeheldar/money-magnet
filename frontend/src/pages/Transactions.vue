<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="text-h5" style="color: #3BA99F; font-weight: 600;">Transactions</div>
            <q-space />
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
          </div>
          
          <q-table
            :rows="displayRows"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loading"
            :pagination="{ rowsPerPage: 0 }"
            class="transactions-table"
          >
            <template v-slot:top>
              <q-btn
                color="primary"
                icon="add"
                label="Add Transaction"
                @click="showAddRow = true"
                :disable="showAddRow"
              />
            </template>

            <template v-slot:body="props">
              <!-- Add new row at top -->
              <template v-if="showAddRow && props.rowIndex === 0">
                <q-tr key="add-row">
                  <q-td colspan="7">
                    <div class="row q-col-gutter-sm items-center q-pa-sm">
                      <div class="col-2">
                        <q-input
                          v-model="newTransaction.date"
                          label="Date"
                          type="date"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-input
                          v-model="newTransaction.description"
                          label="Description"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-1">
                        <q-select
                          v-model="newTransaction.type"
                          :options="['income', 'expense']"
                          label="Type"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-1">
                        <q-input
                          v-model="newTransaction.amount"
                          label="Amount"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                          :rules="[val => val > 0 || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-select
                          v-model="newTransaction.account_id"
                          :options="accountOptions"
                          option-label="name"
                          option-value="id"
                          label="Account"
                          dense
                          outlined
                          clearable
                          emit-value
                          map-options
                        />
                      </div>
                      <div class="col-2">
                        <q-input
                          v-model="newTransaction.category"
                          label="Category"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-2">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddTransaction"
                          :loading="adding"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelAdd"
                        />
                      </div>
                    </div>
                  </q-td>
                </q-tr>
              </template>

              <!-- Regular transaction rows -->
              <q-tr :props="props" v-else>
                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingTransaction.date"
                    type="date"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else>
                  {{ formatDate(props.row.date) }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingTransaction.description"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else>
                  {{ props.row.description || 'No description' }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-select
                    v-model="editingTransaction.type"
                    :options="['income', 'expense']"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else>
                  {{ props.row.type }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingTransaction.amount"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                  ${{ formatCurrency(Math.abs(props.row.amount)) }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-select
                    v-model="editingTransaction.account_id"
                    :options="accountOptions"
                    option-label="name"
                    option-value="id"
                    dense
                    outlined
                    clearable
                    emit-value
                    map-options
                  />
                </q-td>
                <q-td v-else>
                  {{ props.row.account_name || '-' }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingTransaction.category"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else>
                  {{ props.row.category_name || '-' }}
                </q-td>

                <q-td>
                  <div v-if="editingId === props.row.id">
                    <q-btn
                      flat
                      dense
                      icon="check"
                      color="positive"
                      @click="onUpdateTransaction"
                      :loading="updating"
                    />
                    <q-btn
                      flat
                      dense
                      icon="close"
                      color="negative"
                      @click="cancelEdit"
                    />
                  </div>
                  <div v-else>
                    <q-btn
                      flat
                      dense
                      icon="edit"
                      @click="startEdit(props.row)"
                    />
                    <q-btn
                      flat
                      dense
                      icon="delete"
                      color="negative"
                      @click="deleteTransaction(props.row.id)"
                    />
                  </div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'

export default defineComponent({
  name: 'TransactionsPage',
  setup() {
    const $q = useQuasar()
    const period = ref('monthly')
    const transactions = ref([])
    const accounts = ref([])
    const loading = ref(false)
    const adding = ref(false)
    const updating = ref(false)
    const showAddRow = ref(false)
    const editingId = ref(null)
    
    const columns = [
      { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
      { name: 'description', label: 'Description', field: 'description', align: 'left', sortable: true },
      { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
      { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
      { name: 'account', label: 'Account', field: 'account_name', align: 'left', sortable: true },
      { name: 'category', label: 'Category', field: 'category_name', align: 'left', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]
    
    const newTransaction = ref({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: '',
      category: '',
      account_id: null
    })

    const editingTransaction = ref({
      id: null,
      amount: '',
      date: '',
      type: 'expense',
      description: '',
      category: '',
      account_id: null
    })

    const accountOptions = ref([])

    const displayRows = computed(() => {
      return transactions.value
    })

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

    const loadTransactions = async () => {
      loading.value = true
      try {
        transactions.value = await firebaseApi.getTransactions({ period: period.value })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load transactions'
        })
      } finally {
        loading.value = false
      }
    }

    const loadAccounts = async () => {
      try {
        accounts.value = await firebaseApi.getAccounts()
        accountOptions.value = accounts.value
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load accounts'
        })
      }
    }

    const cancelAdd = () => {
      showAddRow.value = false
      newTransaction.value = {
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        description: '',
        category: '',
        account_id: null
      }
    }

    const onAddTransaction = async () => {
      if (!newTransaction.value.amount || !newTransaction.value.date || !newTransaction.value.type) {
        $q.notify({
          type: 'negative',
          message: 'Amount, date, and type are required'
        })
        return
      }

      adding.value = true
      try {
        await firebaseApi.createTransaction({
          ...newTransaction.value,
          amount: parseFloat(newTransaction.value.amount)
        })
        
        $q.notify({
          type: 'positive',
          message: 'Transaction added successfully'
        })
        
        cancelAdd()
        await loadTransactions()
        await loadAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to add transaction'
        })
      } finally {
        adding.value = false
      }
    }

    const startEdit = (transaction) => {
      editingId.value = transaction.id
      editingTransaction.value = {
        id: transaction.id,
        amount: Math.abs(transaction.amount),
        date: transaction.date,
        type: transaction.type,
        description: transaction.description || '',
        category: transaction.category || '',
        account_id: transaction.account_id || null
      }
    }

    const cancelEdit = () => {
      editingId.value = null
      editingTransaction.value = {
        id: null,
        amount: '',
        date: '',
        type: 'expense',
        description: '',
        category: '',
        account_id: null
      }
    }

    const onUpdateTransaction = async () => {
      if (!editingTransaction.value.amount || !editingTransaction.value.date || !editingTransaction.value.type) {
        $q.notify({
          type: 'negative',
          message: 'Amount, date, and type are required'
        })
        return
      }

      updating.value = true
      try {
        await firebaseApi.updateTransaction(editingTransaction.value.id, {
          ...editingTransaction.value,
          amount: parseFloat(editingTransaction.value.amount)
        })
        
        $q.notify({
          type: 'positive',
          message: 'Transaction updated successfully'
        })
        
        cancelEdit()
        await loadTransactions()
        await loadAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to update transaction'
        })
      } finally {
        updating.value = false
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
          await firebaseApi.deleteTransaction(id)
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
      accountOptions,
      columns,
      loading,
      adding,
      updating,
      showAddRow,
      editingId,
      newTransaction,
      editingTransaction,
      displayRows,
      formatCurrency,
      formatDate,
      loadTransactions,
      cancelAdd,
      onAddTransaction,
      startEdit,
      cancelEdit,
      onUpdateTransaction,
      deleteTransaction
    }
  }
})
</script>

<style scoped>
.transactions-table {
  font-size: 14px;
}
</style>

