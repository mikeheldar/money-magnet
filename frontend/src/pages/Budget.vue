<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Budget</div>
          
          <q-table
            :rows="displayRows"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loading"
            :pagination="{ rowsPerPage: 0 }"
            class="budget-table"
            hide-bottom
          >
            <template v-slot:body="props">
              <!-- Income Section Header -->
              <q-tr v-if="props.row.isIncomeHeader" :key="'income-header'" class="bg-grey-2">
                <q-td colspan="4">
                  <div class="row items-center">
                    <q-btn
                      flat
                      dense
                      round
                      :icon="incomeExpanded ? 'expand_less' : 'expand_more'"
                      @click="incomeExpanded = !incomeExpanded"
                      size="sm"
                    />
                    <span class="text-weight-bold q-ml-sm">Income</span>
                  </div>
                </q-td>
              </q-tr>

              <!-- Income Items (when expanded) -->
              <template v-if="incomeExpanded && props.row.isIncomeHeader">
                <template v-for="item in incomeItems" :key="`income-${item.id || item.name}`">
                  <!-- Group Header Row -->
                  <q-tr v-if="item.isGroup" class="budget-group-row bg-grey-1">
                    <q-td>
                      <div style="padding-left: 2rem;" class="text-weight-medium">
                        {{ item.name }}
                      </div>
                    </q-td>
                    <q-td class="text-right text-weight-medium">
                      ${{ formatCurrency(item.budget || 0) }}
                    </q-td>
                    <q-td class="text-right text-weight-medium">
                      ${{ formatCurrency(item.actual || 0) }}
                    </q-td>
                    <q-td class="text-right text-weight-medium" :class="item.remaining >= 0 ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(item.remaining || 0) }}
                    </q-td>
                    <q-td></q-td>
                  </q-tr>
                  <!-- Child Items -->
                  <template v-if="item.isGroup && item.children">
                    <q-tr
                      v-for="child in item.children"
                      :key="`income-child-${child.id || child.name}`"
                      class="budget-item-row"
                    >
                      <q-td>
                        <div style="padding-left: 4rem;">
                          {{ child.name }}
                        </div>
                      </q-td>
                      <q-td class="text-right">
                        <template v-if="editingBudgetId === child.id">
                          <q-input
                            v-model="editingBudget.amount"
                            type="number"
                            step="0.01"
                            dense
                            outlined
                            prefix="$"
                            style="max-width: 120px;"
                          />
                        </template>
                        <template v-else>
                          ${{ formatCurrency(child.budget || 0) }}
                        </template>
                      </q-td>
                      <q-td class="text-right">
                        ${{ formatCurrency(child.actual || 0) }}
                      </q-td>
                      <q-td class="text-right" :class="child.remaining >= 0 ? 'text-positive' : 'text-negative'">
                        ${{ formatCurrency(child.remaining || 0) }}
                      </q-td>
                      <q-td>
                        <template v-if="editingBudgetId === child.id">
                          <q-btn
                            flat
                            dense
                            icon="check"
                            color="positive"
                            @click="onSaveBudget(child)"
                            :loading="savingBudget"
                          />
                          <q-btn
                            flat
                            dense
                            icon="close"
                            color="negative"
                            @click="cancelEditBudget"
                          />
                        </template>
                        <template v-else>
                          <q-btn
                            flat
                            round
                            dense
                            icon="edit"
                            @click="editBudget(child, 'income')"
                          />
                        </template>
                      </q-td>
                    </q-tr>
                  </template>
                  <!-- Non-group item -->
                  <q-tr
                    v-if="!item.isGroup"
                    class="budget-item-row"
                  >
                    <q-td>
                      <div style="padding-left: 2rem;">
                        {{ item.name }}
                      </div>
                    </q-td>
                  <q-td class="text-right">
                    <template v-if="editingBudgetId === item.id">
                      <q-input
                        v-model="editingBudget.amount"
                        type="number"
                        step="0.01"
                        dense
                        outlined
                        prefix="$"
                        style="max-width: 120px;"
                      />
                    </template>
                    <template v-else>
                      ${{ formatCurrency(item.budget || 0) }}
                    </template>
                  </q-td>
                  <q-td class="text-right">
                    ${{ formatCurrency(item.actual || 0) }}
                  </q-td>
                  <q-td class="text-right" :class="item.remaining >= 0 ? 'text-positive' : 'text-negative'">
                    ${{ formatCurrency(item.remaining || 0) }}
                  </q-td>
                  <q-td>
                    <template v-if="editingBudgetId === item.id">
                      <q-btn
                        flat
                        dense
                        icon="check"
                        color="positive"
                        @click="onSaveBudget(item)"
                        :loading="savingBudget"
                      />
                      <q-btn
                        flat
                        dense
                        icon="close"
                        color="negative"
                        @click="cancelEditBudget"
                      />
                    </template>
                    <template v-else>
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        @click="editBudget(item, 'income')"
                      />
                    </template>
                  </q-td>
                </q-tr>
                </template>

                <!-- Add Income Budget Row -->
                <q-tr v-if="showAddIncome" key="add-income-row">
                  <q-td colspan="5">
                    <div class="row q-col-gutter-sm items-center q-pa-sm" style="padding-left: 2rem;">
                      <div class="col-4">
                        <q-select
                          v-model="newBudget.category_id"
                          :options="categories.value.filter(c => c.type === 'income')"
                          option-label="name"
                          option-value="id"
                          label="Category"
                          dense
                          outlined
                          emit-value
                          map-options
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-input
                          v-model="newBudget.amount"
                          label="Budget Amount"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                          prefix="$"
                          :rules="[val => val > 0 || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-select
                          v-model="newBudget.period"
                          :options="['monthly', 'weekly', 'yearly']"
                          label="Period"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-4">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddBudget('income')"
                          :loading="savingBudget"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelAddBudget"
                        />
                      </div>
                    </div>
                  </q-td>
                </q-tr>

                <!-- Total Income Row -->
                <q-tr key="income-total" class="bg-grey-1">
                  <q-td>
                    <div class="text-weight-bold" style="padding-left: 2rem;">Total Income</div>
                  </q-td>
                  <q-td class="text-right text-weight-bold">
                    ${{ formatCurrency(totalIncome.budget) }}
                  </q-td>
                  <q-td class="text-right text-weight-bold">
                    ${{ formatCurrency(totalIncome.actual) }}
                  </q-td>
                  <q-td class="text-right text-weight-bold" :class="totalIncome.remaining >= 0 ? 'text-positive' : 'text-negative'">
                    ${{ formatCurrency(totalIncome.remaining) }}
                  </q-td>
                  <q-td>
                    <q-btn
                      flat
                      round
                      dense
                      icon="add"
                      color="primary"
                      @click="showAddIncome = true"
                      :disable="showAddIncome"
                    />
                  </q-td>
                </q-tr>
              </template>

              <!-- Expenses Section Header -->
              <q-tr v-if="props.row.isExpenseHeader" :key="'expense-header'" class="bg-grey-2">
                <q-td colspan="4">
                  <div class="row items-center">
                    <q-btn
                      flat
                      dense
                      round
                      :icon="expensesExpanded ? 'expand_less' : 'expand_more'"
                      @click="expensesExpanded = !expensesExpanded"
                      size="sm"
                    />
                    <span class="text-weight-bold q-ml-sm">Expenses</span>
                  </div>
                </q-td>
              </q-tr>

              <!-- Expense Items (when expanded) -->
              <template v-if="expensesExpanded && props.row.isExpenseHeader">
                <template v-for="item in expenseItems" :key="`expense-${item.id || item.name}`">
                  <!-- Group Header Row -->
                  <q-tr v-if="item.isGroup" class="budget-group-row bg-grey-1">
                    <q-td>
                      <div class="row items-center" style="padding-left: 2rem;">
                        <q-btn
                          flat
                          dense
                          round
                          :icon="collapsedGroups[item.id] ? 'expand_more' : 'expand_less'"
                          @click="collapsedGroups[item.id] = !collapsedGroups[item.id]"
                          size="sm"
                        />
                        <span class="text-weight-medium q-ml-sm">{{ item.name }}</span>
                      </div>
                    </q-td>
                    <q-td class="text-right text-weight-medium">
                      ${{ formatCurrency(item.budget || 0) }}
                    </q-td>
                    <q-td class="text-right text-weight-medium">
                      ${{ formatCurrency(item.actual || 0) }}
                    </q-td>
                    <q-td class="text-right text-weight-medium" :class="item.remaining >= 0 ? 'text-positive' : 'text-negative'">
                      ${{ formatCurrency(item.remaining || 0) }}
                    </q-td>
                    <q-td></q-td>
                  </q-tr>
                  <!-- Child Items -->
                  <template v-if="item.isGroup && item.children && !collapsedGroups[item.id]">
                    <q-tr
                      v-for="child in item.children"
                      :key="`expense-child-${child.id || child.name}`"
                      class="budget-item-row"
                    >
                      <q-td>
                        <div style="padding-left: 4rem;">
                          {{ child.name }}
                        </div>
                      </q-td>
                      <q-td class="text-right">
                        <template v-if="editingBudgetId === child.id">
                          <q-input
                            v-model="editingBudget.amount"
                            type="number"
                            step="0.01"
                            dense
                            outlined
                            prefix="$"
                            style="max-width: 120px;"
                          />
                        </template>
                        <template v-else>
                          ${{ formatCurrency(child.budget || 0) }}
                        </template>
                      </q-td>
                      <q-td class="text-right">
                        ${{ formatCurrency(child.actual || 0) }}
                      </q-td>
                      <q-td class="text-right" :class="child.remaining >= 0 ? 'text-positive' : 'text-negative'">
                        ${{ formatCurrency(child.remaining || 0) }}
                      </q-td>
                      <q-td>
                        <template v-if="editingBudgetId === child.id">
                          <q-btn
                            flat
                            dense
                            icon="check"
                            color="positive"
                            @click="onSaveBudget(child)"
                            :loading="savingBudget"
                          />
                          <q-btn
                            flat
                            dense
                            icon="close"
                            color="negative"
                            @click="cancelEditBudget"
                          />
                        </template>
                        <template v-else>
                          <q-btn
                            flat
                            round
                            dense
                            icon="edit"
                            @click="editBudget(child, 'expense')"
                          />
                          <q-btn
                            flat
                            round
                            dense
                            icon="delete"
                            color="negative"
                            @click="deleteBudget(child.id)"
                          />
                        </template>
                      </q-td>
                    </q-tr>
                  </template>
                  <!-- Non-group item -->
                  <q-tr
                    v-if="!item.isGroup"
                    class="budget-item-row"
                  >
                    <q-td>
                      <div style="padding-left: 2rem;">
                        {{ item.name }}
                      </div>
                    </q-td>
                  <q-td class="text-right">
                    <template v-if="editingBudgetId === item.id">
                      <q-input
                        v-model="editingBudget.amount"
                        type="number"
                        step="0.01"
                        dense
                        outlined
                        prefix="$"
                        style="max-width: 120px;"
                      />
                    </template>
                    <template v-else>
                      ${{ formatCurrency(item.budget || 0) }}
                    </template>
                  </q-td>
                  <q-td class="text-right">
                    ${{ formatCurrency(item.actual || 0) }}
                  </q-td>
                  <q-td class="text-right" :class="item.remaining >= 0 ? 'text-positive' : 'text-negative'">
                    ${{ formatCurrency(item.remaining || 0) }}
                  </q-td>
                  <q-td>
                    <template v-if="editingBudgetId === item.id">
                      <q-btn
                        flat
                        dense
                        icon="check"
                        color="positive"
                        @click="onSaveBudget(item)"
                        :loading="savingBudget"
                      />
                      <q-btn
                        flat
                        dense
                        icon="close"
                        color="negative"
                        @click="cancelEditBudget"
                      />
                    </template>
                    <template v-else>
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        @click="editBudget(item, 'expense')"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteBudget(item.id)"
                      />
                    </template>
                  </q-td>
                </q-tr>
                </template>

                <!-- Add Expense Budget Row -->
                <q-tr v-if="showAddExpense" key="add-expense-row">
                  <q-td colspan="5">
                    <div class="row q-col-gutter-sm items-center q-pa-sm" style="padding-left: 2rem;">
                      <div class="col-4">
                        <q-select
                          v-model="newBudget.category_id"
                          :options="categories.value.filter(c => c.type === 'expense')"
                          option-label="name"
                          option-value="id"
                          label="Category"
                          dense
                          outlined
                          emit-value
                          map-options
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-input
                          v-model="newBudget.amount"
                          label="Budget Amount"
                          type="number"
                          step="0.01"
                          dense
                          outlined
                          prefix="$"
                          :rules="[val => val > 0 || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-select
                          v-model="newBudget.period"
                          :options="['monthly', 'weekly', 'yearly']"
                          label="Period"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-4">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddBudget('expense')"
                          :loading="savingBudget"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelAddBudget"
                        />
                      </div>
                    </div>
                  </q-td>
                </q-tr>

                <!-- Total Expenses Row -->
                <q-tr key="expense-total" class="bg-grey-1">
                  <q-td>
                    <div class="text-weight-bold" style="padding-left: 2rem;">Total Expenses</div>
                  </q-td>
                  <q-td class="text-right text-weight-bold">
                    ${{ formatCurrency(totalExpenses.budget) }}
                  </q-td>
                  <q-td class="text-right text-weight-bold">
                    ${{ formatCurrency(totalExpenses.actual) }}
                  </q-td>
                  <q-td class="text-right text-weight-bold" :class="totalExpenses.remaining >= 0 ? 'text-positive' : 'text-negative'">
                    ${{ formatCurrency(totalExpenses.remaining) }}
                  </q-td>
                  <q-td>
                    <q-btn
                      flat
                      round
                      dense
                      icon="add"
                      color="primary"
                      @click="showAddExpense = true"
                      :disable="showAddExpense"
                    />
                  </q-td>
                </q-tr>
              </template>
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

export default defineComponent({
  name: 'BudgetPage',
  setup() {
    const $q = useQuasar()
    const loading = ref(false)
    const savingBudget = ref(false)
    const incomeExpanded = ref(true)
    const expensesExpanded = ref(true)
    const showAddIncome = ref(false)
    const showAddExpense = ref(false)
    const editingBudgetId = ref(null)
    const collapsedGroups = ref({}) // Track collapsed state for each group
    
    const budgets = ref([])
    const categories = ref([])
    const transactions = ref([])
    
    const columns = [
      { name: 'name', label: 'Category', field: 'name', align: 'left', sortable: false },
      { name: 'budget', label: 'Budget', field: 'budget', align: 'right', sortable: false },
      { name: 'actual', label: 'Actual', field: 'actual', align: 'right', sortable: false },
      { name: 'remaining', label: 'Remaining', field: 'remaining', align: 'right', sortable: false },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]

    const newBudget = ref({
      category_id: null,
      amount: '',
      period: 'monthly'
    })

    const editingBudget = ref({
      id: null,
      category_id: null,
      amount: '',
      period: 'monthly'
    })

    const incomeCategoryOptions = computed(() => {
      // Only show top-level categories (parent groups) for income
      return categories.value.filter(c => c.type === 'income' && !c.parent_id)
    })

    const expenseCategoryOptions = computed(() => {
      // Only show top-level categories (parent groups) for expenses
      return categories.value.filter(c => c.type === 'expense' && !c.parent_id)
    })
    
    const getChildCategories = (parentId) => {
      return categories.value.filter(c => c.parent_id === parentId)
    }

    const displayRows = computed(() => {
      const rows = []
      rows.push({ id: 'income-header', isIncomeHeader: true })
      rows.push({ id: 'expense-header', isExpenseHeader: true })
      return rows
    })

    const incomeItems = computed(() => {
      const items = []
      const currentMonth = new Date()
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      // Group by category groups (parent categories)
      incomeCategoryOptions.value.forEach(parentCategory => {
        const childCategories = getChildCategories(parentCategory.id)
        
        // If no children, show parent as item
        if (childCategories.length === 0) {
          const budget = budgets.value.find(b => 
            b.category_id === parentCategory.id && 
            b.period === 'monthly'
          )
          
          const categoryTransactions = transactions.value.filter(t => 
            t.category_id === parentCategory.id &&
            t.type === 'income' &&
            new Date(t.date) >= monthStart &&
            new Date(t.date) <= monthEnd
          )
          
          const actual = categoryTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
          const budgetAmount = budget ? parseFloat(budget.amount) : 0
          const remaining = budgetAmount - actual
          
          items.push({
            id: budget?.id,
            name: parentCategory.name,
            category_id: parentCategory.id,
            budget: budgetAmount,
            actual: actual,
            remaining: remaining,
            period: budget?.period || 'monthly',
            isGroup: false
          })
        } else {
          // Group has children - aggregate transactions by parent group
          let groupBudget = 0
          let groupActual = 0
          const childItems = []
          
          // Get all transactions for child categories
          const allChildTransactions = transactions.value.filter(t => {
            const cat = categories.value.find(c => c.id === t.category_id)
            return cat && cat.parent_id === parentCategory.id &&
                   t.type === 'income' &&
                   new Date(t.date) >= monthStart &&
                   new Date(t.date) <= monthEnd
          })
          
          groupActual = allChildTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
          
          // Get budgets for child categories
          childCategories.forEach(childCategory => {
            const budget = budgets.value.find(b => 
              b.category_id === childCategory.id && 
              b.period === 'monthly'
            )
            
            const categoryTransactions = allChildTransactions.filter(t => t.category_id === childCategory.id)
            const actual = categoryTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
            const budgetAmount = budget ? parseFloat(budget.amount) : 0
            const remaining = budgetAmount - actual
            
            groupBudget += budgetAmount
            
            childItems.push({
              id: budget?.id,
              name: childCategory.name,
              category_id: childCategory.id,
              budget: budgetAmount,
              actual: actual,
              remaining: remaining,
              period: budget?.period || 'monthly',
              parent_id: parentCategory.id,
              isGroup: false
            })
          })
          
          items.push({
            id: `group-${parentCategory.id}`,
            name: parentCategory.name,
            category_id: parentCategory.id,
            budget: groupBudget,
            actual: groupActual,
            remaining: groupBudget - groupActual,
            period: 'monthly',
            isGroup: true,
            children: childItems
          })
        }
      })
      
      return items.sort((a, b) => a.name.localeCompare(b.name))
    })

    const expenseItems = computed(() => {
      const items = []
      const currentMonth = new Date()
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      // Group by category groups (parent categories)
      expenseCategoryOptions.value.forEach(parentCategory => {
        const childCategories = getChildCategories(parentCategory.id)
        
        // If no children, show parent as item
        if (childCategories.length === 0) {
          const budget = budgets.value.find(b => 
            b.category_id === parentCategory.id && 
            b.period === 'monthly'
          )
          
          const categoryTransactions = transactions.value.filter(t => 
            t.category_id === parentCategory.id &&
            t.type === 'expense' &&
            new Date(t.date) >= monthStart &&
            new Date(t.date) <= monthEnd
          )
          
          const actual = categoryTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
          const budgetAmount = budget ? parseFloat(budget.amount) : 0
          const remaining = budgetAmount - actual
          
          items.push({
            id: budget?.id,
            name: parentCategory.name,
            category_id: parentCategory.id,
            budget: budgetAmount,
            actual: actual,
            remaining: remaining,
            period: budget?.period || 'monthly',
            isGroup: false
          })
        } else {
          // Group has children - aggregate transactions by parent group
          let groupBudget = 0
          let groupActual = 0
          const childItems = []
          
          // Get all transactions for child categories
          const allChildTransactions = transactions.value.filter(t => {
            const cat = categories.value.find(c => c.id === t.category_id)
            return cat && cat.parent_id === parentCategory.id &&
                   t.type === 'expense' &&
                   new Date(t.date) >= monthStart &&
                   new Date(t.date) <= monthEnd
          })
          
          groupActual = allChildTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
          
          // Get budgets for child categories
          childCategories.forEach(childCategory => {
            const budget = budgets.value.find(b => 
              b.category_id === childCategory.id && 
              b.period === 'monthly'
            )
            
            const categoryTransactions = allChildTransactions.filter(t => t.category_id === childCategory.id)
            const actual = categoryTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
            const budgetAmount = budget ? parseFloat(budget.amount) : 0
            const remaining = budgetAmount - actual
            
            groupBudget += budgetAmount
            
            childItems.push({
              id: budget?.id,
              name: childCategory.name,
              category_id: childCategory.id,
              budget: budgetAmount,
              actual: actual,
              remaining: remaining,
              period: budget?.period || 'monthly',
              parent_id: parentCategory.id,
              isGroup: false
            })
          })
          
          items.push({
            id: `group-${parentCategory.id}`,
            name: parentCategory.name,
            category_id: parentCategory.id,
            budget: groupBudget,
            actual: groupActual,
            remaining: groupBudget - groupActual,
            period: 'monthly',
            isGroup: true,
            children: childItems
          })
        }
      })
      
      return items.sort((a, b) => a.name.localeCompare(b.name))
    })

    const totalIncome = computed(() => {
      // Sum all individual categories (not groups), so totals are accurate
      let totalBudget = 0
      let totalActual = 0
      
      incomeItems.value.forEach(item => {
        if (item.isGroup && item.children) {
          // For groups, sum all child categories
          item.children.forEach(child => {
            totalBudget += child.budget || 0
            totalActual += child.actual || 0
          })
        } else {
          // For individual items, add directly
          totalBudget += item.budget || 0
          totalActual += item.actual || 0
        }
      })
      
      return {
        budget: totalBudget,
        actual: totalActual,
        remaining: totalBudget - totalActual
      }
    })

    const totalExpenses = computed(() => {
      // Sum all individual categories (not groups), so totals are accurate
      let totalBudget = 0
      let totalActual = 0
      
      expenseItems.value.forEach(item => {
        if (item.isGroup && item.children) {
          // For groups, sum all child categories
          item.children.forEach(child => {
            totalBudget += child.budget || 0
            totalActual += child.actual || 0
          })
        } else {
          // For individual items, add directly
          totalBudget += item.budget || 0
          totalActual += item.actual || 0
        }
      })
      
      return {
        budget: totalBudget,
        actual: totalActual,
        remaining: totalBudget - totalActual
      }
    })

    const formatCurrency = (value) => {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const loadBudgets = async () => {
      try {
        budgets.value = await firebaseApi.getBudgets()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load budgets'
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

    const loadTransactions = async () => {
      try {
        transactions.value = await firebaseApi.getTransactions({ period: 'monthly' })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load transactions'
        })
      }
    }

    const cancelAddBudget = () => {
      showAddIncome.value = false
      showAddExpense.value = false
      newBudget.value = {
        category_id: null,
        amount: '',
        period: 'monthly'
      }
    }

    const onAddBudget = async (type) => {
      if (!newBudget.value.category_id || !newBudget.value.amount) {
        $q.notify({
          type: 'negative',
          message: 'Category and amount are required'
        })
        return
      }

      savingBudget.value = true
      try {
        const currentMonth = new Date()
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        
        await firebaseApi.createBudget({
          category_id: newBudget.value.category_id,
          amount: parseFloat(newBudget.value.amount),
          period: newBudget.value.period,
          start_date: monthStart.toISOString().split('T')[0]
        })
        
        $q.notify({
          type: 'positive',
          message: 'Budget added successfully'
        })
        
        cancelAddBudget()
        await loadBudgets()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to add budget'
        })
      } finally {
        savingBudget.value = false
      }
    }

    const editBudget = (item, type) => {
      editingBudgetId.value = item.id
      editingBudget.value = {
        id: item.id,
        category_id: item.category_id,
        amount: item.budget,
        period: item.period
      }
    }

    const cancelEditBudget = () => {
      editingBudgetId.value = null
      editingBudget.value = {
        id: null,
        category_id: null,
        amount: '',
        period: 'monthly'
      }
    }

    const onSaveBudget = async (item) => {
      if (!editingBudget.value.amount) {
        $q.notify({
          type: 'negative',
          message: 'Amount is required'
        })
        return
      }

      savingBudget.value = true
      try {
        if (editingBudget.value.id) {
          await firebaseApi.updateBudget(editingBudget.value.id, {
            amount: parseFloat(editingBudget.value.amount),
            period: editingBudget.value.period
          })
        } else {
          // Create new budget if editing a category without one
          const currentMonth = new Date()
          const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          await firebaseApi.createBudget({
            category_id: editingBudget.value.category_id,
            amount: parseFloat(editingBudget.value.amount),
            period: editingBudget.value.period,
            start_date: monthStart.toISOString().split('T')[0]
          })
        }
        
        $q.notify({
          type: 'positive',
          message: 'Budget saved successfully'
        })
        
        cancelEditBudget()
        await loadBudgets()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to save budget'
        })
      } finally {
        savingBudget.value = false
      }
    }

    const deleteBudget = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this budget?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteBudget(id)
          $q.notify({
            type: 'positive',
            message: 'Budget deleted'
          })
          await loadBudgets()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: 'Failed to delete budget'
          })
        }
      })
    }

    onMounted(async () => {
      loading.value = true
      await Promise.all([
        loadCategories(),
        loadBudgets(),
        loadTransactions()
      ])
      loading.value = false
    })

    return {
      loading,
      savingBudget,
      incomeExpanded,
      expensesExpanded,
      showAddIncome,
      showAddExpense,
      editingBudgetId,
      budgets,
      categories,
      transactions,
      columns,
      newBudget,
      editingBudget,
      incomeCategoryOptions,
      expenseCategoryOptions,
      displayRows,
      incomeItems,
      expenseItems,
      totalIncome,
      totalExpenses,
      collapsedGroups,
      getChildCategories,
      formatCurrency,
      cancelAddBudget,
      onAddBudget,
      editBudget,
      cancelEditBudget,
      onSaveBudget,
      deleteBudget
    }
  }
})
</script>

<style scoped>
.budget-table {
  font-size: 14px;
}

.budget-item-row {
  background-color: #fafafa;
}

.budget-item-row:hover {
  background-color: #f5f5f5;
}
</style>

