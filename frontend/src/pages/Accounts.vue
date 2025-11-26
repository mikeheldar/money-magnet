<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Accounts</div>
          
          <q-table
            :rows="displayRows"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loading"
            :pagination="{ rowsPerPage: 0 }"
            class="accounts-table"
          >
            <template v-slot:top>
              <q-btn
                color="primary"
                icon="add"
                label="Add Account"
                @click="showAddRow = true"
                :disable="showAddRow"
                class="q-mr-sm"
              />
              <q-btn
                color="secondary"
                icon="account_balance"
                label="Connect with Plaid"
                @click="connectWithPlaid"
                :loading="plaidLoading"
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
                          v-model="newAccount.name"
                          label="Name"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-select
                          v-model="newAccount.account_type_id"
                          :options="accountTypeOptions"
                          option-label="name"
                          option-value="id"
                          label="Type"
                          dense
                          outlined
                          emit-value
                          map-options
                          @update:model-value="onAccountTypeChange"
                        />
                      </div>
                      <div class="col-1">
                        <q-input
                          v-model="newAccount.balance_current"
                          label="Balance"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-1" v-if="isCreditCardType(newAccount.account_type_id)">
                        <q-input
                          v-model="newAccount.credit_limit"
                          label="Limit"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-1" v-else>
                        <div></div>
                      </div>
                      <div class="col-1" v-if="isDebtType(newAccount.account_type_id)">
                        <q-input
                          v-model="newAccount.interest_rate"
                          label="Rate %"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-1" v-else>
                        <div></div>
                      </div>
                      <div class="col-1" v-if="isCreditCardType(newAccount.account_type_id)">
                        <q-item-label class="text-caption">
                          ${{ formatCurrency((newAccount.credit_limit || 0) + (newAccount.balance_current || 0)) }}
                        </q-item-label>
                      </div>
                      <div class="col-1" v-else>
                        <div></div>
                      </div>
                      <div class="col-2">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddAccount"
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

              <!-- Regular account rows -->
              <q-tr :props="props" v-else>
                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingAccount.name"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else>
                  {{ props.row.name }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-select
                    v-model="editingAccount.account_type_id"
                    :options="accountTypeOptions"
                    option-label="name"
                    option-value="id"
                    dense
                    outlined
                    emit-value
                    map-options
                    @update:model-value="onEditAccountTypeChange"
                  />
                </q-td>
                <q-td v-else>
                  {{ getAccountTypeName(props.row.account_type_id) || formatType(props.row.type) }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-model="editingAccount.balance_current"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                  />
                </q-td>
                <q-td v-else :class="props.row.balance_current >= 0 ? 'text-positive' : 'text-negative'">
                  ${{ formatCurrency(props.row.balance_current) }}
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-if="isCreditCardType(editingAccount.account_type_id)"
                    v-model="editingAccount.credit_limit"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                  />
                  <div v-else></div>
                </q-td>
                <q-td v-else>
                  <span v-if="props.row.credit_limit">${{ formatCurrency(props.row.credit_limit) }}</span>
                  <span v-else>-</span>
                </q-td>

                <q-td v-if="editingId === props.row.id">
                  <q-input
                    v-if="isDebtType(editingAccount.account_type_id)"
                    v-model="editingAccount.interest_rate"
                    type="number"
                    step="0.01"
                    dense
                    outlined
                  />
                  <div v-else></div>
                </q-td>
                <q-td v-else>
                  <span v-if="props.row.interest_rate">{{ props.row.interest_rate }}%</span>
                  <span v-else>-</span>
                </q-td>

                <q-td>
                  <span v-if="isCreditCardType(props.row.account_type_id) && props.row.credit_limit">
                    ${{ formatCurrency((props.row.credit_limit || 0) + props.row.balance_current) }}
                  </span>
                  <span v-else>-</span>
                </q-td>

                <q-td>
                  <div v-if="editingId === props.row.id">
                    <q-btn
                      flat
                      dense
                      icon="check"
                      color="positive"
                      @click="onUpdateAccount"
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
                      @click="deleteAccount(props.row)"
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
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'
import plaidService from '../services/plaid-service'

export default defineComponent({
  name: 'AccountsPage',
  setup() {
    const $q = useQuasar()
    const accounts = ref([])
    const accountTypes = ref([])
    const loading = ref(false)
    const adding = ref(false)
    const updating = ref(false)
    const showAddRow = ref(false)
    const editingId = ref(null)
    const plaidLoading = ref(false)
    
    const accountTypeOptions = computed(() => {
      return accountTypes.value.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code
      }))
    })
    
    const columns = [
      { name: 'name', label: 'Account Name', field: 'name', align: 'left', sortable: true },
      { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
      { name: 'balance', label: 'Balance', field: 'balance_current', align: 'right', sortable: true },
      { name: 'credit_limit', label: 'Credit Limit', field: 'credit_limit', align: 'right', sortable: true },
      { name: 'interest_rate', label: 'Interest Rate', field: 'interest_rate', align: 'right', sortable: true },
      { name: 'available', label: 'Available', field: 'available', align: 'right', sortable: false },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]
    
    const newAccount = ref({
      name: '',
      balance_current: 0,
      account_type_id: null,
      type: null,
      interest_rate: null,
      credit_limit: null,
      currency: 'USD'
    })

    const editingAccount = ref({
      id: null,
      name: '',
      balance_current: 0,
      account_type_id: null,
      type: null,
      interest_rate: null,
      credit_limit: null,
      currency: 'USD'
    })

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatType = (type) => {
      if (!type) return 'Unknown'
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const getAccountTypeName = (accountTypeId) => {
      if (!accountTypeId) return null
      const type = accountTypes.value.find(t => t.id === accountTypeId)
      return type ? type.name : null
    }

    const getAccountTypeCode = (accountTypeId) => {
      if (!accountTypeId) return null
      const type = accountTypes.value.find(t => t.id === accountTypeId)
      return type ? type.code : null
    }

    const isCreditCardType = (accountTypeId) => {
      const code = getAccountTypeCode(accountTypeId)
      return code === 'credit_card'
    }

    const isDebtType = (accountTypeId) => {
      const code = getAccountTypeCode(accountTypeId)
      return code === 'credit_card' || code === 'loan' || code === 'mortgage'
    }

    const displayRows = computed(() => {
      return accounts.value || []
    })

    const loadAccounts = async () => {
      loading.value = true
      try {
        accounts.value = await firebaseApi.getAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load accounts'
        })
      } finally {
        loading.value = false
      }
    }

    const loadAccountTypes = async () => {
      try {
        accountTypes.value = await firebaseApi.getAccountTypes()
        // Set default account type for new account (first one or checking)
        if (accountTypes.value.length > 0 && !newAccount.value.account_type_id) {
          const checkingType = accountTypes.value.find(t => t.code === 'checking')
          newAccount.value.account_type_id = checkingType ? checkingType.id : accountTypes.value[0].id
        }
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load account types'
        })
      }
    }

    const onAccountTypeChange = () => {
      if (!isDebtType(newAccount.value.account_type_id)) {
        newAccount.value.interest_rate = null
      }
      if (!isCreditCardType(newAccount.value.account_type_id)) {
        newAccount.value.credit_limit = null
      }
    }

    const onEditAccountTypeChange = () => {
      if (!isDebtType(editingAccount.value.account_type_id)) {
        editingAccount.value.interest_rate = null
      }
      if (!isCreditCardType(editingAccount.value.account_type_id)) {
        editingAccount.value.credit_limit = null
      }
    }

    const cancelAdd = () => {
      showAddRow.value = false
      const checkingType = accountTypes.value.find(t => t.code === 'checking')
      newAccount.value = {
        name: '',
        balance_current: 0,
        account_type_id: checkingType ? checkingType.id : (accountTypes.value[0]?.id || null),
        type: null,
        interest_rate: null,
        credit_limit: null,
        currency: 'USD'
      }
    }

    const onAddAccount = async () => {
      if (!newAccount.value.name) {
        $q.notify({
          type: 'negative',
          message: 'Account name is required'
        })
        return
      }

      adding.value = true
      try {
        await firebaseApi.createAccount({
          ...newAccount.value,
          balance_current: parseFloat(newAccount.value.balance_current || 0),
          interest_rate: newAccount.value.interest_rate ? parseFloat(newAccount.value.interest_rate) : null,
          credit_limit: newAccount.value.credit_limit ? parseFloat(newAccount.value.credit_limit) : null
        })
        
        $q.notify({
          type: 'positive',
          message: 'Account added successfully'
        })
        
        cancelAdd()
        await loadAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to add account'
        })
      } finally {
        adding.value = false
      }
    }

    const startEdit = (account) => {
      editingId.value = account.id
      editingAccount.value = {
        id: account.id,
        name: account.name,
        balance_current: account.balance_current,
        account_type_id: account.account_type_id,
        type: account.type,
        interest_rate: account.interest_rate,
        credit_limit: account.credit_limit,
        currency: account.currency || 'USD'
      }
    }

    const cancelEdit = () => {
      editingId.value = null
      editingAccount.value = {
        id: null,
        name: '',
        balance_current: 0,
        account_type_id: null,
        type: null,
        interest_rate: null,
        credit_limit: null,
        currency: 'USD'
      }
    }

    const onUpdateAccount = async () => {
      updating.value = true
      try {
        const selectedType = accountTypes.value.find(t => t.id === editingAccount.value.account_type_id)
        await firebaseApi.updateAccount(editingAccount.value.id, {
          name: editingAccount.value.name,
          balance_current: parseFloat(editingAccount.value.balance_current),
          account_type_id: editingAccount.value.account_type_id,
          type: selectedType ? selectedType.code : editingAccount.value.type,
          interest_rate: editingAccount.value.interest_rate ? parseFloat(editingAccount.value.interest_rate) : null,
          credit_limit: editingAccount.value.credit_limit ? parseFloat(editingAccount.value.credit_limit) : null,
          currency: editingAccount.value.currency
        })
        
        $q.notify({
          type: 'positive',
          message: 'Account updated successfully'
        })
        
        cancelEdit()
        await loadAccounts()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to update account'
        })
      } finally {
        updating.value = false
      }
    }

    const deleteAccount = async (account) => {
      const accountId = typeof account === 'object' ? account.id : account
      const accountName = typeof account === 'object' ? account.name : 'this account'
      
      // Get transactions for this account to check count
      try {
        const accountTransactions = await firebaseApi.getTransactions({ account_id: accountId })
        const transactionCount = accountTransactions.length
        
        let message = `Are you sure you want to delete "${accountName}"?`
        if (transactionCount > 0) {
          message += `\n\n⚠️ WARNING: This account has ${transactionCount} transaction${transactionCount > 1 ? 's' : ''}. All transactions associated with this account will also be permanently deleted.`
        } else {
          message += '\n\nThis account has no transactions.'
        }
        
        $q.dialog({
          title: 'Confirm Deletion',
          message: message,
          cancel: true,
          persistent: true,
          ok: {
            label: 'Delete',
            color: 'negative',
            flat: true
          },
          cancel: {
            label: 'Cancel',
            color: 'primary',
            flat: true
          }
        }).onOk(async () => {
          try {
            const result = await firebaseApi.deleteAccount(accountId)
            const transactionsDeleted = result.transactionsDeleted || 0
            
            let notifyMessage = 'Account deleted successfully'
            if (transactionsDeleted > 0) {
              notifyMessage += `. ${transactionsDeleted} transaction${transactionsDeleted > 1 ? 's were' : ' was'} also deleted.`
            }
            
            $q.notify({
              type: 'positive',
              message: notifyMessage,
              timeout: 3000
            })
            await loadAccounts()
          } catch (err) {
            $q.notify({
              type: 'negative',
              message: err.response?.data?.error || 'Failed to delete account'
            })
          }
        })
      } catch (err) {
        // If we can't get transactions, still allow deletion but show warning
        $q.dialog({
          title: 'Confirm Deletion',
          message: `Are you sure you want to delete "${accountName}"?\n\n⚠️ WARNING: Any transactions associated with this account will also be permanently deleted.`,
          cancel: true,
          persistent: true,
          ok: {
            label: 'Delete',
            color: 'negative',
            flat: true
          },
          cancel: {
            label: 'Cancel',
            color: 'primary',
            flat: true
          }
        }).onOk(async () => {
          try {
            const result = await firebaseApi.deleteAccount(accountId)
            $q.notify({
              type: 'positive',
              message: 'Account deleted successfully'
            })
            await loadAccounts()
          } catch (err) {
            $q.notify({
              type: 'negative',
              message: err.response?.data?.error || 'Failed to delete account'
            })
          }
        })
      }
    }

    const connectWithPlaid = async () => {
      console.log('🟢 [Accounts] connectWithPlaid called')
      plaidLoading.value = true
      try {
        console.log('🟢 [Accounts] Creating Plaid link token...')
        // Create link token
        const linkToken = await firebaseApi.createPlaidLinkToken()
        console.log('✅ [Accounts] Link token received, length:', linkToken?.length)
        
        console.log('🟢 [Accounts] Initializing Plaid Link service...')
        // Initialize Plaid Link
        await plaidService.initialize(
          linkToken,
          async (publicToken, metadata) => {
            console.log('🟢 [Accounts] Plaid Link success callback')
            console.log('  - Public token received:', publicToken ? 'Yes' : 'No')
            console.log('  - Metadata:', metadata)
            try {
              console.log('🟢 [Accounts] Exchanging public token...')
              // Exchange public token for access token
              const result = await firebaseApi.exchangePlaidPublicToken(publicToken)
              console.log('✅ [Accounts] Token exchanged successfully')
              
              console.log('🟢 [Accounts] Syncing accounts from Plaid...')
              // Sync accounts from Plaid
              const accounts = await firebaseApi.syncPlaidAccounts(result.access_token)
              console.log('✅ [Accounts] Accounts synced:', accounts.length)
              
              $q.notify({
                type: 'positive',
                message: `Successfully connected ${accounts.length} account(s) from ${metadata.institution?.name || 'your bank'}`
              })
              
              // Reload accounts
              await loadAccounts()
            } catch (err) {
              console.error('❌ [Accounts] Error syncing Plaid accounts:', err)
              console.error('  - Error details:', JSON.stringify(err, null, 2))
              $q.notify({
                type: 'negative',
                message: err.message || 'Failed to sync accounts from Plaid'
              })
            }
          },
          (err, metadata) => {
            console.log('🟡 [Accounts] Plaid Link exit callback')
            console.log('  - Error:', err)
            console.log('  - Metadata:', metadata)
            if (err) {
              console.error('❌ [Accounts] Plaid Link error:', err)
              console.error('  - Error message:', err.error_message)
              console.error('  - Error type:', err.error_type)
              console.error('  - Error code:', err.error_code)
              $q.notify({
                type: 'negative',
                message: err.error_message || 'Failed to connect with Plaid'
              })
            }
          }
        )
        
        console.log('🟢 [Accounts] Opening Plaid Link...')
        // Open Plaid Link
        plaidService.open()
      } catch (err) {
        console.error('❌ [Accounts] Error connecting with Plaid:')
        console.error('  - Error:', err)
        console.error('  - Error message:', err.message)
        console.error('  - Error stack:', err.stack)
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to initialize Plaid connection'
        })
      } finally {
        plaidLoading.value = false
        console.log('🟢 [Accounts] connectWithPlaid completed')
      }
    }

    onMounted(async () => {
      await loadAccountTypes()
      await loadAccounts()
    })

    return {
      accounts,
      accountTypes,
      accountTypeOptions,
      columns,
      loading,
      adding,
      updating,
      showAddRow,
      editingId,
      newAccount,
      editingAccount,
      formatCurrency,
      formatType,
      getAccountTypeName,
      isCreditCardType,
      isDebtType,
      displayRows,
      loadAccounts,
      loadAccountTypes,
      onAccountTypeChange,
      onEditAccountTypeChange,
      cancelAdd,
      onAddAccount,
      startEdit,
      cancelEdit,
      onUpdateAccount,
      deleteAccount,
      connectWithPlaid,
      plaidLoading
    }
  }
})
</script>

<style scoped>
.accounts-table {
  font-size: 14px;
}
</style>
