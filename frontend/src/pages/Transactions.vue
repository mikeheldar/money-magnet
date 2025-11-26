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
            :filter="filter"
            class="transactions-table"
            :rows-per-page-options="[0]"
          >
            <template v-slot:top>
              <div class="row full-width items-center q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Transaction"
                  @click="showAddRow = true"
                  :disable="showAddRow"
                />
                <q-space />
                <q-input
                  v-model="filter"
                  placeholder="Search transactions..."
                  dense
                  outlined
                  clearable
                  class="col-12 col-sm-4"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </template>
            

            <template v-slot:body="props">
              <!-- Add new row at top -->
              <template v-if="showAddRow && props.rowIndex === 0">
                <q-tr key="add-row" class="add-transaction-row">
                  <q-td class="date-cell">
                    <q-input
                      v-model="newTransaction.date"
                      type="date"
                      dense
                      outlined
                      hide-bottom-space
                      :rules="[val => !!val || 'Required']"
                    />
                  </q-td>
                  <q-td class="merchant-cell">
                    <q-input
                      v-model="newTransaction.merchant"
                      dense
                      outlined
                      hide-bottom-space
                    />
                  </q-td>
                  <q-td class="description-cell">
                    <q-input
                      v-model="newTransaction.description"
                      dense
                      outlined
                      hide-bottom-space
                    />
                  </q-td>
                  <q-td class="type-cell">
                    <q-select
                      v-model="newTransaction.type"
                      :options="['income', 'expense']"
                      dense
                      outlined
                      hide-bottom-space
                      :rules="[val => !!val || 'Required']"
                    />
                  </q-td>
                  <q-td class="amount-cell">
                    <q-input
                      v-model="newTransaction.amount"
                      type="number"
                      step="0.01"
                      dense
                      outlined
                      hide-bottom-space
                      :rules="[val => val > 0 || 'Required']"
                    />
                  </q-td>
                  <q-td class="account-cell">
                    <q-select
                      v-model="newTransaction.account_id"
                      :options="accountOptions"
                      option-label="name"
                      option-value="id"
                      dense
                      outlined
                      hide-bottom-space
                      clearable
                      emit-value
                      map-options
                    />
                  </q-td>
                  <q-td class="category-cell">
                    <q-select
                      v-model="newTransaction.category_id"
                      :options="categoryOptions"
                      option-label="name"
                      option-value="id"
                      dense
                      outlined
                      hide-bottom-space
                      clearable
                      emit-value
                      map-options
                    />
                  </q-td>
                  <q-td class="actions-cell">
                    <div class="row items-center q-gutter-xs">
                      <q-btn
                        flat
                        dense
                        round
                        icon="check"
                        color="positive"
                        size="sm"
                        @click="onAddTransaction"
                        :loading="adding"
                      />
                      <q-btn
                        flat
                        dense
                        round
                        icon="close"
                        color="negative"
                        size="sm"
                        @click="cancelAdd"
                      />
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
                    v-model="editingTransaction.merchant"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else class="merchant-cell">
                  <q-tooltip v-if="props.row.merchant && props.row.merchant.length > 20">
                    {{ props.row.merchant }}
                  </q-tooltip>
                  <span class="text-ellipsis">{{ props.row.merchant || '-' }}</span>
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingTransaction.description"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else class="description-cell">
                  <q-tooltip v-if="props.row.description && props.row.description.length > 30">
                    {{ props.row.description }}
                  </q-tooltip>
                  <span class="text-ellipsis">{{ props.row.description || 'No description' }}</span>
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
                <q-td v-else class="account-cell">
                  <q-tooltip v-if="props.row.account_name && props.row.account_name.length > 20">
                    {{ props.row.account_name }}
                  </q-tooltip>
                  <span class="text-ellipsis">{{ props.row.account_name || '-' }}</span>
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-select
                    v-model="editingTransaction.category_id"
                    :options="categoryOptions"
                    option-label="name"
                    option-value="id"
                    dense
                    outlined
                    clearable
                    emit-value
                    map-options
                  />
                </q-td>
                <q-td v-else class="category-cell">
                  <div class="row items-center no-wrap">
                    <span class="text-ellipsis">{{ props.row.category_name || '-' }}</span>
                    <q-badge 
                      v-if="props.row.category_suggested" 
                      color="blue" 
                      label="AI" 
                      class="q-ml-xs"
                      size="sm"
                    >
                      <q-tooltip>Auto-categorized by AI</q-tooltip>
                    </q-badge>
                  </div>
                  <q-tooltip v-if="props.row.category_name && props.row.category_name.length > 15">
                    {{ props.row.category_name }}
                  </q-tooltip>
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
    const categories = ref([])
    const loading = ref(false)
    const adding = ref(false)
    const updating = ref(false)
    const showAddRow = ref(false)
    const editingId = ref(null)
    
    const filter = ref('')
    
    const columns = [
      { 
        name: 'date', 
        label: 'Date', 
        field: 'date', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 120px; min-width: 120px;',
        classes: 'date-cell'
      },
      { 
        name: 'merchant', 
        label: 'Merchant', 
        field: 'merchant', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 180px; min-width: 150px; max-width: 250px;',
        classes: 'merchant-cell'
      },
      { 
        name: 'description', 
        label: 'Description', 
        field: 'description', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 250px; min-width: 200px; max-width: 300px;',
        classes: 'description-cell'
      },
      { 
        name: 'type', 
        label: 'Type', 
        field: 'type', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 100px; min-width: 100px;',
        classes: 'type-cell'
      },
      { 
        name: 'amount', 
        label: 'Amount', 
        field: 'amount', 
        align: 'right', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 120px; min-width: 120px;',
        classes: 'amount-cell'
      },
      { 
        name: 'account', 
        label: 'Account', 
        field: 'account_name', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 180px; min-width: 150px;',
        classes: 'account-cell'
      },
      { 
        name: 'category', 
        label: 'Category', 
        field: 'category_name', 
        align: 'left', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 150px; min-width: 120px;',
        classes: 'category-cell'
      },
      { 
        name: 'actions', 
        label: 'Actions', 
        field: 'actions', 
        align: 'center', 
        sortable: false,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 100px; min-width: 100px;',
        classes: 'actions-cell'
      }
    ]
    
    const newTransaction = ref({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: '',
      merchant: '',
      category_id: null,
      account_id: null
    })

    const editingTransaction = ref({
      id: null,
      amount: '',
      date: '',
      type: 'expense',
      description: '',
      merchant: '',
      category_id: null,
      account_id: null
    })

    const accountOptions = ref([])
    
    const categoryOptions = computed(() => {
      // Filter categories based on transaction type
      const type = editingId.value ? editingTransaction.value.type : newTransaction.value.type
      // Show all categories (both parent groups and children) for the selected type
      return categories.value
        .filter(c => c.type === type)
        .map(c => {
          const parent = c.parent_id ? categories.value.find(p => p.id === c.parent_id) : null
          return {
            id: c.id,
            name: parent ? `${parent.name} - ${c.name}` : c.name,
            type: c.type
          }
        })
    })
    
    const getCategoryName = (categoryId) => {
      if (!categoryId) return null
      const category = categories.value.find(c => c.id === categoryId)
      return category ? category.name : null
    }

    const displayRows = computed(() => {
      let filtered = transactions.value
      
      if (filter.value) {
        const searchTerm = filter.value.toLowerCase()
        filtered = filtered.filter(t => {
          return (
            (t.description || '').toLowerCase().includes(searchTerm) ||
            (t.merchant || '').toLowerCase().includes(searchTerm) ||
            (t.type || '').toLowerCase().includes(searchTerm) ||
            (t.account_name || '').toLowerCase().includes(searchTerm) ||
            (t.category_name || '').toLowerCase().includes(searchTerm) ||
            formatCurrency(Math.abs(t.amount || 0)).includes(searchTerm) ||
            formatDate(t.date).toLowerCase().includes(searchTerm)
          )
        })
      }
      
      return filtered
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
    
    const loadCategories = async () => {
      try {
        categories.value = await firebaseApi.getCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load categories'
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
        merchant: '',
        category_id: null,
        account_id: null
      }
    }

    const onAddTransaction = async () => {
      console.log('🔵 [Transactions Page] ============================================')
      console.log('🔵 [Transactions Page] onAddTransaction called')
      console.log('🔵 [Transactions Page] New transaction data:', JSON.stringify(newTransaction.value, null, 2))
      
      if (!newTransaction.value.amount || !newTransaction.value.date || !newTransaction.value.type) {
        console.warn('⚠️ [Transactions Page] Validation failed - missing required fields')
        $q.notify({
          type: 'negative',
          message: 'Amount, date, and type are required'
        })
        return
      }

      adding.value = true
      try {
        const transactionData = {
          ...newTransaction.value,
          amount: parseFloat(newTransaction.value.amount)
        }
        
        console.log('🔵 [Transactions Page] Calling firebaseApi.createTransaction...')
        console.log('🔵 [Transactions Page] Transaction data:', JSON.stringify(transactionData, null, 2))
        
        const result = await firebaseApi.createTransaction(transactionData)
        
        console.log('✅ [Transactions Page] Transaction created successfully!')
        console.log('✅ [Transactions Page] Result:', JSON.stringify(result, null, 2))
        console.log('✅ [Transactions Page] Transaction ID:', result.id)
        console.log('✅ [Transactions Page] This should trigger Firebase Function onTransactionCreated')
        console.log('✅ [Transactions Page] Which should call N8N webhook')
        console.log('🔵 [Transactions Page] ============================================')
        
        $q.notify({
          type: 'positive',
          message: 'Transaction added successfully'
        })
        
        cancelAdd()
        
        console.log('🔵 [Transactions Page] Reloading transactions in 3 seconds to see if category was added...')
        setTimeout(async () => {
          await loadTransactions()
          await loadAccounts()
          console.log('✅ [Transactions Page] Transactions reloaded - check if category was added')
        }, 3000)
      } catch (err) {
        console.error('❌ [Transactions Page] Error creating transaction:', err)
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
        merchant: transaction.merchant || '',
        category_id: transaction.category_id || null,
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
        merchant: '',
        category_id: null,
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
      await loadCategories()
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
      categories,
      accountOptions,
      categoryOptions,
      columns,
      filter,
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
      getCategoryName,
      loadTransactions,
      loadCategories,
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

/* Add transaction row styling */
.add-transaction-row {
  background-color: #f9f9f9;
}

.add-transaction-row :deep(.q-field) {
  margin-bottom: 0;
}

.add-transaction-row :deep(.q-field__control) {
  min-height: 32px;
}

.add-transaction-row :deep(.q-input),
.add-transaction-row :deep(.q-select) {
  font-size: 13px;
}

/* Prominent headers */
.transactions-table :deep(thead th) {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 14px 8px;
  border-bottom: 2px solid #3BA99F;
  background-color: #f5f5f5 !important;
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Fixed column widths with ellipsis */
.transactions-table :deep(.description-cell) {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transactions-table :deep(.description-cell .text-ellipsis) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.transactions-table :deep(.merchant-cell) {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transactions-table :deep(.merchant-cell .text-ellipsis) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.transactions-table :deep(.account-cell),
.transactions-table :deep(.category-cell) {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive column hiding */
@media (max-width: 1024px) {
  .transactions-table :deep(.category-cell) {
    display: none;
  }
}

@media (max-width: 768px) {
  .transactions-table :deep(.account-cell) {
    display: none;
  }
  
  .transactions-table :deep(.description-cell) {
    max-width: 150px;
  }
}

@media (max-width: 600px) {
  .transactions-table :deep(.type-cell) {
    display: none;
  }
}

/* Table cell padding */
.transactions-table :deep(td) {
  padding: 10px 8px;
}

/* Hover effects */
.transactions-table :deep(tbody tr:hover) {
  background-color: #f9f9f9;
}
</style>

