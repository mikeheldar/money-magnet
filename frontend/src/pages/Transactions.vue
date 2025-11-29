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
                <q-btn
                  :color="showUncategorized ? 'accent' : 'grey'"
                  :outline="!showUncategorized"
                  icon="category"
                  label="Uncategorized"
                  @click="showUncategorized = !showUncategorized"
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
                    >
                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section avatar v-if="getCategoryIcon(scope.opt.id)">
                            <q-icon 
                              :name="getCategoryIcon(scope.opt.id).name"
                              :style="{ color: getCategoryIcon(scope.opt.id).color }"
                              size="18px"
                            />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ scope.opt.name }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
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
                  <span :title="getFullDateTime(props.row)">
                    {{ formatDate(props.row.date) }}
                  </span>
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
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section avatar v-if="getCategoryIcon(scope.opt.id)">
                          <q-icon 
                            :name="getCategoryIcon(scope.opt.id).name"
                            :style="{ color: getCategoryIcon(scope.opt.id).color }"
                            size="18px"
                          />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ scope.opt.name }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </q-td>
                <q-td v-else class="category-cell">
                  <div class="row items-center no-wrap">
                    <q-icon 
                      v-if="getCategoryIcon(props.row.category_id)"
                      :name="getCategoryIcon(props.row.category_id).name"
                      :style="{ color: getCategoryIcon(props.row.category_id).color }"
                      size="18px"
                      class="q-mr-xs"
                    />
                    <q-select
                      :model-value="props.row.category_id"
                      @update:model-value="(val) => onCategoryChange(props.row, val)"
                      :options="getCategoryOptionsForType(props.row.type)"
                      option-label="name"
                      option-value="id"
                      dense
                      outlined
                      clearable
                      emit-value
                      map-options
                      style="min-width: 150px;"
                      :loading="categoryUpdating[props.row.id]"
                    >
                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section avatar v-if="getCategoryIcon(scope.opt.id)">
                            <q-icon 
                              :name="getCategoryIcon(scope.opt.id).name"
                              :style="{ color: getCategoryIcon(scope.opt.id).color }"
                              size="18px"
                            />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ scope.opt.name }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                      <template v-slot:selected>
                        <div class="row items-center no-wrap">
                          <q-icon 
                            v-if="getCategoryIcon(props.row.category_id)" 
                            :name="getCategoryIcon(props.row.category_id).name" 
                            :style="{ color: getCategoryIcon(props.row.category_id).color }"
                            size="18px"
                            class="q-mr-xs"
                          />
                          <span v-if="props.row.category_name || getCategoryName(props.row.category_id)">
                            {{ props.row.category_name || getCategoryName(props.row.category_id) }}
                          </span>
                          <span v-else-if="props.row.category_id" class="text-grey-6 text-caption">
                            Invalid Category
                          </span>
                          <span v-else>Select Category</span>
                        </div>
                      </template>
                    </q-select>
                    <q-icon 
                      v-if="props.row.category_source === 'ai'" 
                      name="auto_awesome" 
                      color="primary"
                      size="16px"
                      class="q-ml-xs"
                    >
                      <q-tooltip>Auto-categorized by AI</q-tooltip>
                    </q-icon>
                  </div>
                </q-td>

                <q-td v-if="editingId === props.row.id" class="recurring-cell">
                  <div class="column q-gutter-xs">
                    <q-toggle
                      v-model="editingTransaction.recurring"
                      label="Recurring"
                      dense
                      color="primary"
                    />
                    <q-select
                      v-if="editingTransaction.recurring"
                      v-model="editingTransaction.recurring_frequency"
                      :options="[
                        { label: 'Weekly', value: 'weekly' },
                        { label: 'Monthly', value: 'monthly' },
                        { label: 'Yearly', value: 'yearly' }
                      ]"
                      option-label="label"
                      option-value="value"
                      emit-value
                      map-options
                      dense
                      outlined
                      hide-bottom-space
                      placeholder="Frequency"
                    />
                  </div>
                </q-td>
                <q-td v-else class="recurring-cell">
                  <div class="column items-center">
                    <q-icon
                      v-if="props.row.recurring"
                      name="repeat"
                      :color="props.row.recurring_frequency === 'weekly' ? 'blue' : props.row.recurring_frequency === 'monthly' ? 'green' : 'orange'"
                      size="20px"
                    />
                    <span v-if="props.row.recurring" class="text-caption">
                      {{ props.row.recurring_frequency || 'N/A' }}
                    </span>
                    <span v-else class="text-grey-6 text-caption">-</span>
                  </div>
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
import { auth, db } from '../config/firebase'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'

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
    const categoryUpdating = ref({}) // Track which transactions are updating categories
    const showUncategorized = ref(false)
    
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
        name: 'recurring', 
        label: 'Recurring', 
        field: 'recurring', 
        align: 'center', 
        sortable: true,
        headerClasses: 'text-weight-bold bg-grey-2',
        style: 'width: 120px; min-width: 120px;',
        classes: 'recurring-cell'
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
      account_id: null,
      recurring: false,
      recurring_frequency: null
    })

    const editingTransaction = ref({
      id: null,
      amount: '',
      date: '',
      type: 'expense',
      description: '',
      merchant: '',
      category_id: null,
      account_id: null,
      category_source: null,
      original_category_id: null,
      original_merchant: null,
      recurring: false,
      recurring_frequency: null
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
    
    const getCategoryOptionsForType = (type) => {
      // Get category options for a specific transaction type
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
    }
    
    const getCategoryName = (categoryId) => {
      if (!categoryId) return null
      const category = categories.value.find(c => c.id === categoryId)
      return category ? category.name : null
    }

    const normalize = (str) => {
      if (!str) return ''
      return str
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const onCategoryChange = async (transaction, newCategoryId) => {
      // If category is cleared, just update the transaction
      if (!newCategoryId) {
        try {
          categoryUpdating.value[transaction.id] = true
          const updateData = {
            category_id: null,
            category_source: null,
            category_suggested: null,
            category_confidence: null
          }
          await firebaseApi.updateTransaction(transaction.id, updateData)
          await loadTransactions()
          $q.notify({
            type: 'positive',
            message: 'Category removed'
          })
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: `Failed to update category: ${error.message}`
          })
        } finally {
          categoryUpdating.value[transaction.id] = false
        }
        return
      }

      const oldCategoryId = transaction.category_id
      const categoryName = getCategoryName(newCategoryId)
      const hasMerchant = transaction.merchant && transaction.merchant.trim().length > 0

      // Show dialog to ask about learning the rule
      if (hasMerchant) {
        const result = await new Promise((resolve) => {
          $q.dialog({
            title: 'Learn This Category Rule?',
            message: `Should future transactions from "${transaction.merchant}" automatically be categorized as "${categoryName}"?`,
            cancel: true,
            persistent: true,
            ok: {
              label: 'Learn Rule',
              color: 'primary'
            },
            cancel: {
              label: 'Just This Transaction',
              flat: true
            },
            prompt: {
              model: [],
              type: 'checkbox',
              items: [
                { label: 'Update all historical transactions for this merchant', value: 'updateHistorical' }
              ]
            }
          }).onOk((data) => {
            resolve({
              learn: true,
              updateHistorical: Array.isArray(data) && data.includes('updateHistorical')
            })
          }).onCancel(() => {
            resolve({
              learn: false,
              updateHistorical: false
            })
          })
        })

        if (result.learn) {
          // Learn the rule and optionally update historical transactions
          try {
            categoryUpdating.value[transaction.id] = true
            
            const normalizedMerchant = normalize(transaction.merchant)
            
            if (result.updateHistorical) {
              // Update all historical transactions and learn the rule
              await firebaseApi.updateTransactionsForMerchant({
                user_id: auth.currentUser?.uid,
                merchant: transaction.merchant,
                pattern: normalizedMerchant,
                category_id: newCategoryId,
                category_name: categoryName,
                transaction_type: transaction.type
              })
              
              $q.notify({
                type: 'positive',
                message: `Updated all transactions from "${transaction.merchant}" and learned this pattern`,
                timeout: 3000
              })
            } else {
              // Just learn the rule for future transactions
              // Update this transaction first
              const updateData = {
                category_id: newCategoryId,
                category_source: null,
                category_suggested: null,
                category_confidence: null
              }
              await firebaseApi.updateTransaction(transaction.id, updateData)
              
              // Save the mapping for future transactions (without updating historical)
              const mappingsRef = collection(db, 'category_mappings')
              const existing = await getDocs(query(
                mappingsRef,
                where('user_id', '==', auth.currentUser?.uid),
                where('pattern', '==', normalizedMerchant),
                where('transaction_type', '==', transaction.type)
              ))
              
              if (!existing.empty) {
                await updateDoc(doc(db, 'category_mappings', existing.docs[0].id), {
                  category_id: newCategoryId,
                  category_name: categoryName,
                  confidence: 1.0,
                  match_type: 'exact',
                  updated_at: serverTimestamp()
                })
              } else {
                await addDoc(mappingsRef, {
                  user_id: auth.currentUser?.uid,
                  pattern: normalizedMerchant,
                  category_id: newCategoryId,
                  category_name: categoryName,
                  transaction_type: transaction.type,
                  match_type: 'exact',
                  confidence: 1.0,
                  usage_count: 1,
                  created_at: serverTimestamp(),
                  updated_at: serverTimestamp()
                })
              }
              
              $q.notify({
                type: 'positive',
                message: `Category updated. Future transactions from "${transaction.merchant}" will use this category.`,
                timeout: 3000
              })
            }
            
            await loadTransactions()
          } catch (error) {
            console.error('Error updating category:', error)
            $q.notify({
              type: 'negative',
              message: `Failed to update: ${error.message}`
            })
          } finally {
            categoryUpdating.value[transaction.id] = false
          }
          return
        }
      }

      // Just update this transaction
      try {
        categoryUpdating.value[transaction.id] = true
        const updateData = {
          category_id: newCategoryId,
          category_source: null,
          category_suggested: null,
          category_confidence: null
        }
        await firebaseApi.updateTransaction(transaction.id, updateData)
        await loadTransactions()
        $q.notify({
          type: 'positive',
          message: 'Category updated'
        })
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: `Failed to update category: ${error.message}`
        })
      } finally {
        categoryUpdating.value[transaction.id] = false
      }
    }

    const displayRows = computed(() => {
      let filtered = transactions.value
      
      // Filter by uncategorized if enabled
      if (showUncategorized.value) {
        filtered = filtered.filter(t => !t.category_id)
      }
      
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

    const getCategoryIcon = (categoryId) => {
      if (!categoryId) return null
      const category = categories.value.find(c => c.id === categoryId)
      if (!category || !category.icon) return null
      return {
        name: category.icon,
        color: category.icon_color || '#757575'
      }
    }

    const getFullDateTime = (transaction) => {
      if (!transaction.date) return ''
      // Use the transaction date field, which should be the actual transaction date
      const date = new Date(transaction.date)
      // If date is invalid, try created_at as fallback
      if (isNaN(date.getTime())) {
        if (transaction.created_at && transaction.created_at.toDate) {
          return transaction.created_at.toDate().toLocaleString()
        }
        return transaction.date // Return as-is if can't parse
      }
      return date.toLocaleString()
    }

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
        account_id: null,
        recurring: false,
        recurring_frequency: null
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
          amount: parseFloat(newTransaction.value.amount),
          recurring: newTransaction.value.recurring || false,
          recurring_frequency: newTransaction.value.recurring ? (newTransaction.value.recurring_frequency || null) : null
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
        account_id: transaction.account_id || null,
        category_source: transaction.category_source || null,
        original_category_id: transaction.category_id || null,
        original_merchant: transaction.merchant || '',
        recurring: transaction.recurring || false,
        recurring_frequency: transaction.recurring_frequency || null
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
        account_id: null,
        category_source: null,
        original_category_id: null,
        original_merchant: null,
        recurring: false,
        recurring_frequency: null
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

      const tx = editingTransaction.value
      const wasAICategorized = tx.category_source === 'ai'
      const categoryChanged = tx.category_id !== tx.original_category_id
      const hasMerchant = tx.merchant && tx.merchant.trim().length > 0

      // If AI-categorized transaction category was changed, ask about updating all transactions for merchant
      if (wasAICategorized && categoryChanged && hasMerchant && tx.category_id) {
        const result = await new Promise((resolve) => {
          $q.dialog({
            title: 'Update All Transactions?',
            message: `Update all transactions from "${tx.merchant}" to use this category? This will also learn this pattern for future transactions.`,
            cancel: true,
            persistent: true,
            ok: {
              label: 'Update All & Learn',
              color: 'primary'
            },
            cancel: {
              label: 'Just This One',
              flat: true
            }
          }).onOk(() => resolve(true)).onCancel(() => resolve(false))
        })

        if (result) {
          // Update all transactions for this merchant pattern and save mapping
          try {
            await firebaseApi.updateTransactionsForMerchant({
              user_id: auth.currentUser?.uid,
              merchant: tx.merchant,
              category_id: tx.category_id,
              transaction_type: tx.type
            })
            
            $q.notify({
              type: 'positive',
              message: `Updated all transactions from "${tx.merchant}" and learned this pattern`,
              timeout: 3000
            })
          } catch (err) {
            console.error('Error updating transactions for merchant:', err)
            $q.notify({
              type: 'warning',
              message: 'Updated this transaction, but failed to update others: ' + err.message
            })
          }
        }
      }

      updating.value = true
      try {
        // Remove AI indicators when user manually changes category
        const updateData = {
          ...editingTransaction.value,
          amount: parseFloat(editingTransaction.value.amount),
          recurring: editingTransaction.value.recurring || false,
          recurring_frequency: editingTransaction.value.recurring ? (editingTransaction.value.recurring_frequency || null) : null
        }
        
        // Remove AI indicators if category was changed or confirmed
        if (categoryChanged || !wasAICategorized) {
          delete updateData.category_source
          delete updateData.category_suggested
          delete updateData.category_confidence
        }
        
        await firebaseApi.updateTransaction(tx.id, updateData)
        
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
      getCategoryOptionsForType,
      getCategoryIcon,
      getFullDateTime,
      categoryUpdating,
      showUncategorized,
      onCategoryChange,
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

