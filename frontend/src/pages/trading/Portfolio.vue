<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Portfolio</div>
          <div class="text-caption text-grey-7 q-mb-lg">
            Track your investment accounts and performance
          </div>

          <!-- Portfolio Summary -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-md">Portfolio Summary</div>
              <div v-if="loading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
              </div>
              <div v-else class="row q-gutter-md">
                <q-card flat bordered class="col-12 col-sm-3">
                  <q-card-section>
                    <div class="text-caption text-grey-7">Total Value</div>
                    <div class="text-h5">${{ formatCurrency(portfolio.totalValue) }}</div>
                  </q-card-section>
                </q-card>

                <q-card flat bordered class="col-12 col-sm-3">
                  <q-card-section>
                    <div class="text-caption text-grey-7">Total Gain/Loss</div>
                    <div class="text-h5" :class="portfolio.totalGainLoss >= 0 ? 'text-positive' : 'text-negative'">
                      {{ portfolio.totalGainLoss >= 0 ? '+' : '' }}${{ formatCurrency(Math.abs(portfolio.totalGainLoss)) }}
                    </div>
                  </q-card-section>
                </q-card>

                <q-card flat bordered class="col-12 col-sm-3">
                  <q-card-section>
                    <div class="text-caption text-grey-7">Return %</div>
                    <div class="text-h5" :class="portfolio.returnPercent >= 0 ? 'text-positive' : 'text-negative'">
                      {{ portfolio.returnPercent >= 0 ? '+' : '' }}{{ portfolio.returnPercent.toFixed(2) }}%
                    </div>
                  </q-card-section>
                </q-card>

                <q-card flat bordered class="col-12 col-sm-3">
                  <q-card-section>
                    <div class="text-caption text-grey-7">Accounts</div>
                    <div class="text-h5">{{ portfolio.accountsCount }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </q-card-section>
          </q-card>

          <!-- Investment Accounts -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-sm">
                <div class="text-h6">
                  <q-icon name="account_balance" class="q-mr-sm" />
                  Investment Accounts
                </div>
                <q-space />
                <q-btn 
                  color="primary" 
                  icon="add" 
                  label="Add Account"
                  @click="showAddAccount = true"
                />
              </div>

              <div v-if="investmentAccounts.length === 0" class="text-center q-pa-lg text-grey-7">
                No investment accounts yet. Add one to start tracking your portfolio.
              </div>

              <q-table
                v-else
                :rows="investmentAccounts"
                :columns="accountColumns"
                row-key="id"
                flat
                bordered
                :loading="loading"
                :pagination="{ rowsPerPage: 0 }"
              >
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td>{{ props.row.name }}</q-td>
                    <q-td>${{ formatCurrency(props.row.currentValue) }}</q-td>
                    <q-td :class="props.row.gainLoss >= 0 ? 'text-positive' : 'text-negative'">
                      {{ props.row.gainLoss >= 0 ? '+' : '' }}${{ formatCurrency(Math.abs(props.row.gainLoss)) }}
                    </q-td>
                    <q-td :class="props.row.returnPercent >= 0 ? 'text-positive' : 'text-negative'">
                      {{ props.row.returnPercent >= 0 ? '+' : '' }}{{ props.row.returnPercent.toFixed(2) }}%
                    </q-td>
                    <q-td>
                      <q-btn 
                        flat 
                        dense 
                        icon="edit"
                        @click="editAccount(props.row)"
                      />
                      <q-btn 
                        flat 
                        dense 
                        icon="delete"
                        color="negative"
                        @click="deleteAccount(props.row.id)"
                      />
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </q-card-section>
          </q-card>

          <!-- Asset Allocation -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-sm">
                <q-icon name="pie_chart" class="q-mr-sm" />
                Asset Allocation
              </div>
              <div v-if="assetAllocation.length === 0" class="text-center q-pa-lg text-grey-7">
                No asset allocation data available.
              </div>
              <q-list v-else>
                <q-item v-for="(asset, index) in assetAllocation" :key="index">
                  <q-item-section>
                    <q-item-label>{{ asset.name }}</q-item-label>
                    <q-linear-progress 
                      :value="asset.percentage / 100" 
                      color="primary"
                      class="q-mt-xs"
                    />
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label>{{ asset.percentage.toFixed(1) }}%</q-item-label>
                    <q-item-label caption>${{ formatCurrency(asset.value) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>

      <!-- Add Account Dialog -->
      <q-dialog v-model="showAddAccount">
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Add Investment Account</div>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="newAccount.name"
              label="Account Name"
              outlined
              class="q-mb-sm"
            />
            <q-input
              v-model="newAccount.currentValue"
              label="Current Value"
              type="number"
              step="0.01"
              outlined
              prefix="$"
              class="q-mb-sm"
            />
            <q-input
              v-model="newAccount.initialValue"
              label="Initial Investment"
              type="number"
              step="0.01"
              outlined
              prefix="$"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn flat label="Add" color="primary" v-close-popup @click="addAccount" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../../services/firebase-api'

export default defineComponent({
  name: 'PortfolioPage',
  setup() {
    const $q = useQuasar()
    const loading = ref(false)
    const investmentAccounts = ref([])
    const showAddAccount = ref(false)
    const newAccount = ref({
      name: '',
      currentValue: '',
      initialValue: ''
    })

    const accountColumns = [
      { name: 'name', label: 'Account', field: 'name', align: 'left' },
      { name: 'value', label: 'Current Value', field: 'currentValue', align: 'right' },
      { name: 'gainLoss', label: 'Gain/Loss', field: 'gainLoss', align: 'right' },
      { name: 'return', label: 'Return %', field: 'returnPercent', align: 'right' },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
    ]

    const portfolio = computed(() => {
      const totalValue = investmentAccounts.value.reduce((sum, acc) => 
        sum + (parseFloat(acc.currentValue) || 0), 0)
      
      const totalInitial = investmentAccounts.value.reduce((sum, acc) => 
        sum + (parseFloat(acc.initialValue) || 0), 0)
      
      const totalGainLoss = totalValue - totalInitial
      const returnPercent = totalInitial > 0 ? (totalGainLoss / totalInitial) * 100 : 0

      return {
        totalValue,
        totalGainLoss,
        returnPercent,
        accountsCount: investmentAccounts.value.length
      }
    })

    const assetAllocation = computed(() => {
      const total = portfolio.value.totalValue
      if (total === 0) return []

      return investmentAccounts.value.map(acc => ({
        name: acc.name,
        value: parseFloat(acc.currentValue) || 0,
        percentage: total > 0 ? ((parseFloat(acc.currentValue) || 0) / total) * 100 : 0
      }))
    })

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const loadPortfolio = async () => {
      loading.value = true
      try {
        // Get investment accounts
        const accounts = await firebaseApi.getAccounts()
        investmentAccounts.value = accounts
          .filter(acc => acc.type === 'investment' || acc.account_type_id) // Filter investment accounts
          .map(acc => {
            const currentValue = parseFloat(acc.balance_current) || 0
            const initialValue = parseFloat(acc.initial_investment) || currentValue
            const gainLoss = currentValue - initialValue
            const returnPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0

            return {
              id: acc.id,
              name: acc.name,
              currentValue: currentValue,
              initialValue: initialValue,
              gainLoss: gainLoss,
              returnPercent: returnPercent
            }
          })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load portfolio'
        })
      } finally {
        loading.value = false
      }
    }

    const addAccount = async () => {
      if (!newAccount.value.name || !newAccount.value.currentValue) {
        $q.notify({
          type: 'negative',
          message: 'Account name and current value are required'
        })
        return
      }

      try {
        // Create investment account
        const account = await firebaseApi.createAccount({
          name: newAccount.value.name,
          type: 'investment',
          balance_current: parseFloat(newAccount.value.currentValue),
          initial_investment: parseFloat(newAccount.value.initialValue) || parseFloat(newAccount.value.currentValue)
        })

        await loadPortfolio()
        newAccount.value = { name: '', currentValue: '', initialValue: '' }
        $q.notify({
          type: 'positive',
          message: 'Account added successfully'
        })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to add account'
        })
      }
    }

    const editAccount = (account) => {
      // TODO: Implement account editing
      $q.notify({
        type: 'info',
        message: 'Account editing coming soon'
      })
    }

    const deleteAccount = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this account?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteAccount(id)
          await loadPortfolio()
          $q.notify({
            type: 'positive',
            message: 'Account deleted'
          })
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: 'Failed to delete account'
          })
        }
      })
    }

    onMounted(() => {
      loadPortfolio()
    })

    return {
      loading,
      investmentAccounts,
      portfolio,
      assetAllocation,
      accountColumns,
      showAddAccount,
      newAccount,
      formatCurrency,
      addAccount,
      editAccount,
      deleteAccount
    }
  }
})
</script>

<style scoped>
.q-card {
  margin-bottom: 16px;
}
</style>



