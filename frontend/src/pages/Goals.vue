<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <!-- Daily quote / mantra banner -->
        <q-card class="q-mb-md" style="border-left: 4px solid #3BA99F;">
          <q-card-section class="bg-grey-1">
            <div class="text-caption text-grey-7 q-mb-xs">{{ personalMantra ? 'Your mantra' : 'Daily mantra' }}</div>
            <div class="text-h6" style="color: #2c3e50;">{{ personalMantra ? '“' + personalMantra.text + '”' : quoteOfTheDay }}</div>
            <div v-if="personalMantra" class="text-caption text-grey-6 q-mt-xs">— your words, for {{ personalMantra.goalTitle }}</div>
            <div v-if="groundedLine" class="text-body2 text-weight-medium q-mt-sm" style="color: #3BA99F;">
              {{ groundedLine }}
            </div>
            <div v-if="beliefJournal.length" class="q-mt-sm">
              <q-btn
                flat dense no-caps size="sm" color="grey-7"
                :icon="journalOpen ? 'expand_less' : 'menu_book'"
                :label="journalOpen ? 'Hide journal' : 'Belief journal'"
                @click="journalOpen = !journalOpen"
              />
              <q-slide-transition>
                <div v-show="journalOpen" class="q-mt-xs">
                  <div v-for="e in beliefJournal" :key="e.day" class="q-py-xs" style="border-top: 1px solid #eee;">
                    <div class="text-caption text-grey-6">{{ journalDate(e.day) }}</div>
                    <div class="text-body2" style="color: #2c3e50;">
                      “{{ e.mantra }}”<span v-if="e.personal && e.goal_title" class="text-grey-6"> — for {{ e.goal_title }}</span>
                    </div>
                    <div v-if="e.fact" class="text-caption" style="color: #3BA99F;">{{ e.fact }}</div>
                  </div>
                </div>
              </q-slide-transition>
            </div>
          </q-card-section>
        </q-card>

        <!-- Goals section -->
        <q-card style="border-radius: 12px;">
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h5" style="color: #3BA99F; font-weight: 600;">Your financial goals</div>
              <q-btn
                color="primary"
                icon="add"
                label="Add goal"
                @click="openAddDialog"
              />
            </div>

            <div v-if="loading" class="row justify-center q-pa-lg">
              <q-spinner-dots color="primary" size="40px" />
            </div>

            <div v-else-if="goals.length === 0" class="text-center q-pa-xl text-grey-7">
              <q-icon name="emoji_events" size="64px" class="q-mb-md" />
              <div class="text-h6 q-mb-sm">No goals yet</div>
              <div class="text-body2 q-mb-md">Add a money goal to build your vision board.</div>
              <q-btn color="primary" label="Add your first goal" icon="add" @click="openAddDialog" />
            </div>

            <div v-else class="row q-col-gutter-md">
              <div
                v-for="goal in goals"
                :key="goal.id"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-card flat bordered class="goal-card" :class="{ 'goal-card-pinned': goal.pinned }">
                  <q-card-section>
                    <div class="row items-start justify-between">
                      <div class="col">
                        <div class="row items-center q-gutter-xs q-mb-sm">
                          <q-btn
                            flat
                            dense
                            round
                            size="sm"
                            :icon="goal.pinned ? 'push_pin' : 'push_pin'"
                            :color="goal.pinned ? 'primary' : 'grey'"
                            @click="togglePin(goal)"
                          >
                            <q-tooltip>{{ goal.pinned ? 'Unpin' : 'Pin' }}</q-tooltip>
                          </q-btn>
                          <span class="text-subtitle1 text-weight-bold">{{ goal.title }}</span>
                        </div>
                        <p v-if="goal.description" class="text-body2 text-grey-8 q-mt-none q-mb-sm goal-description">
                          {{ truncate(goal.description, 120) }}
                        </p>
                        <p v-if="goal.mantra" class="text-body2 text-italic q-mt-none q-mb-sm" style="color: #3BA99F;">
                          “{{ truncate(goal.mantra, 140) }}”
                        </p>
                        <div v-if="goal.target_date || (goal.target_start_date && goal.target_end_date)" class="text-caption text-grey-7 q-mb-sm">
                          {{ formatTimePeriod(goal) }}
                        </div>
                        <div v-if="goal.target_amount > 0 && !isSpendLimit(goal)" class="q-mb-sm">
                          <div class="row items-center justify-between q-mb-xs">
                            <span class="text-caption text-grey-8">
                              ${{ formatCurrency(goalCurrentAmount(goal)) }} of ${{ formatCurrency(goal.target_amount) }}
                            </span>
                            <span class="text-caption text-weight-bold" :class="goalProgress(goal) >= 1 ? 'text-positive' : 'text-grey-7'">
                              {{ Math.round(goalProgress(goal) * 100) }}%
                            </span>
                          </div>
                          <q-linear-progress
                            :value="goalProgress(goal)"
                            :color="goalProgress(goal) >= 1 ? 'positive' : 'primary'"
                            size="8px"
                            rounded
                          />
                          <div v-if="goal.linked_account_id" class="text-caption text-grey-6 q-mt-xs">
                            <q-icon name="account_balance" size="12px" class="q-mr-xs" />{{ linkedAccountName(goal) }}
                          </div>
                        </div>
                        <div v-if="goal.target_amount > 0 && isSpendLimit(goal)" class="q-mb-sm">
                          <div class="row items-center justify-between q-mb-xs">
                            <span class="text-caption text-grey-8">
                              ${{ formatCurrency(spentForGoal(goal)) }} of ${{ formatCurrency(goal.target_amount) }} limit
                            </span>
                            <span class="text-caption text-weight-bold" :class="spendStatusClass(goal)">
                              {{ spendRemainingLabel(goal) }}
                            </span>
                          </div>
                          <q-linear-progress
                            :value="Math.min(1, spendProgress(goal))"
                            :color="spendBarColor(goal)"
                            size="8px"
                            rounded
                          />
                          <div class="text-caption text-grey-6 q-mt-xs">
                            <q-icon name="category" size="12px" class="q-mr-xs" />{{ goalCategoryName(goal) }} · {{ spendPeriodLabel(goal) }}
                          </div>
                        </div>
                        <div v-if="goal.links && goal.links.length" class="q-gutter-xs">
                          <q-chip
                            v-for="(link, idx) in goal.links"
                            :key="idx"
                            dense
                            clickable
                            @click="openLink(link.url)"
                          >
                            <q-icon name="link" size="14px" class="q-mr-xs" />
                            {{ link.label || link.url }}
                          </q-chip>
                        </div>
                      </div>
                      <div class="row q-gutter-xs">
                        <q-btn flat dense round icon="edit" size="sm" @click="openEditDialog(goal)">
                          <q-tooltip>Edit</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round icon="delete" size="sm" color="negative" @click="confirmDelete(goal)">
                          <q-tooltip>Delete</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Add / Edit goal dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 400px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">{{ editingGoal ? 'Edit goal' : 'Add goal' }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="form.title"
            label="Title *"
            outlined
            dense
            class="q-mb-md"
            :rules="[v => !!v || 'Required']"
          />
          <q-input
            v-model="form.description"
            label="Description"
            outlined
            dense
            type="textarea"
            rows="3"
            class="q-mb-md"
          />
          <q-input
            v-model="form.mantra"
            label="Your mantra (optional)"
            outlined
            dense
            class="q-mb-md"
            hint="Your belief for this goal, in your own words — it headlines the daily banner, grounded with your real numbers"
          />
          <q-btn-toggle
            v-model="form.goal_type"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="grey-2"
            text-color="grey-8"
            class="q-mb-md"
            :options="[
              { label: 'Save up', value: 'save' },
              { label: 'Spending limit', value: 'spend_limit' }
            ]"
          />
          <div v-if="form.goal_type !== 'spend_limit'" class="row q-col-gutter-sm q-mb-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.target_amount"
                label="Target amount (optional)"
                type="number"
                prefix="$"
                outlined
                dense
                clearable
                min="0"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.linked_account_id"
                :options="accountOptions"
                label="Track with account (optional)"
                outlined
                dense
                clearable
                emit-value
                map-options
              />
            </div>
          </div>
          <div v-if="form.goal_type === 'spend_limit'" class="row q-col-gutter-sm q-mb-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.category_id"
                :options="expenseCategoryOptions"
                label="Category *"
                outlined
                dense
                clearable
                emit-value
                map-options
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="form.target_amount"
                label="Spending limit *"
                type="number"
                prefix="$"
                outlined
                dense
                clearable
                min="0"
                hint="Per month, or over the date range below"
              />
            </div>
          </div>
          <q-input
            v-if="form.goal_type !== 'spend_limit' && form.target_amount && !form.linked_account_id"
            v-model.number="form.current_amount"
            label="Saved so far"
            type="number"
            prefix="$"
            outlined
            dense
            clearable
            min="0"
            class="q-mb-md"
            hint="Update this manually, or link an account above to track automatically"
          />
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-sm">Links</div>
            <div v-for="(link, idx) in form.links" :key="idx" class="row q-gutter-sm q-mb-sm">
              <q-input v-model="link.url" placeholder="URL" outlined dense class="col" />
              <q-input v-model="link.label" placeholder="Label" outlined dense class="col" />
              <q-btn flat dense round icon="remove_circle_outline" color="negative" @click="form.links.splice(idx, 1)" />
            </div>
            <q-btn flat dense icon="add" label="Add link" @click="form.links.push({ url: '', label: '' })" />
          </div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.target_date"
                label="Target date (optional)"
                type="date"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7 q-mb-xs">Or date range</div>
              <div class="row q-col-gutter-xs">
                <q-input v-model="form.target_start_date" type="date" outlined dense clearable placeholder="Start" class="col" />
                <q-input v-model="form.target_end_date" type="date" outlined dense clearable placeholder="End" class="col" />
              </div>
            </div>
          </div>
          <q-toggle v-model="form.pinned" label="Pin this goal" color="primary" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" :label="editingGoal ? 'Save' : 'Add'" :loading="saving" @click="saveGoal" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete confirmation -->
    <q-dialog v-model="deleteDialogOpen" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete goal?</div>
          <div class="text-body2 q-mt-sm">This cannot be undone.</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="negative" label="Delete" :loading="deleting" @click="doDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'
import { getQuoteOfTheDay } from '../utils/goals-quotes'

export default defineComponent({
  name: 'GoalsPage',
  setup() {
    const $q = useQuasar()
    const loading = ref(true)
    const saving = ref(false)
    const deleting = ref(false)
    const goals = ref([])
    const accounts = ref([])
    const categories = ref([])
    const spendTransactions = ref([])
    const dialogOpen = ref(false)
    const deleteDialogOpen = ref(false)
    const editingGoal = ref(null)
    const goalToDelete = ref(null)

    const quoteOfTheDay = computed(() => getQuoteOfTheDay())

    // The user's own belief statement, rotated daily across goals that have one —
    // when present it replaces the stock quote as the banner headline
    const personalMantra = computed(() => {
      const withMantra = goals.value.filter(g => g.mantra && g.mantra.trim())
      if (!withMantra.length) return null
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 0)
      const dayOfYear = Math.floor((today - startOfYear) / 864e5)
      const g = withMantra[dayOfYear % withMantra.length]
      return { text: g.mantra.trim(), goalId: g.id, goalTitle: g.title }
    })
    const groundedLine = ref('')

    const form = ref({
      title: '',
      description: '',
      mantra: '',
      links: [],
      target_date: null,
      target_start_date: null,
      target_end_date: null,
      target_amount: null,
      current_amount: null,
      linked_account_id: null,
      goal_type: 'save',
      category_id: null,
      pinned: false
    })

    const resetForm = () => {
      form.value = {
        title: '',
        description: '',
        mantra: '',
        links: [],
        target_date: null,
        target_start_date: null,
        target_end_date: null,
        target_amount: null,
        current_amount: null,
        linked_account_id: null,
        goal_type: 'save',
        category_id: null,
        pinned: false
      }
      editingGoal.value = null
    }

    const loadGoals = async () => {
      loading.value = true
      try {
        goals.value = await firebaseApi.getGoals()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to load goals' })
      } finally {
        loading.value = false
      }
    }

    const loadAccounts = async () => {
      try {
        accounts.value = await firebaseApi.getAccounts()
      } catch (err) {
        // Progress bars fall back to manual amounts; goals still work without accounts
        console.warn('Failed to load accounts for goal progress:', err.message)
      }
    }

    const loadCategories = async () => {
      try {
        categories.value = await firebaseApi.getCategories()
      } catch (err) {
        console.warn('Failed to load categories for goals:', err.message)
      }
    }

    const isSpendLimit = (goal) => goal.goal_type === 'spend_limit'

    const spendPeriodRange = (goal) => {
      if (goal.target_start_date && goal.target_end_date) {
        return { start: goal.target_start_date, end: goal.target_end_date }
      }
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0]
      }
    }

    const loadSpending = async () => {
      const limitGoals = goals.value.filter(isSpendLimit)
      if (!limitGoals.length) {
        spendTransactions.value = []
        return
      }
      const ranges = limitGoals.map(spendPeriodRange)
      const start = ranges.map(r => r.start).sort()[0]
      const end = ranges.map(r => r.end).sort().slice(-1)[0]
      try {
        spendTransactions.value = await firebaseApi.getTransactionsByDateRange(start, end)
      } catch (err) {
        console.warn('Failed to load spending for goals:', err.message)
      }
    }

    const spentForGoal = (goal) => {
      if (!goal.category_id) return 0
      const ids = new Set([goal.category_id])
      categories.value.forEach(c => { if (c.parent_id === goal.category_id) ids.add(c.id) })
      const { start, end } = spendPeriodRange(goal)
      return spendTransactions.value.reduce((sum, t) => {
        if (t.type !== 'expense' || !ids.has(t.category_id)) return sum
        if (!t.date || t.date < start || t.date > end) return sum
        return sum + Math.abs(parseFloat(t.amount) || 0)
      }, 0)
    }

    const spendProgress = (goal) => {
      if (!goal.target_amount || goal.target_amount <= 0) return 0
      return spentForGoal(goal) / goal.target_amount
    }

    const spendBarColor = (goal) => {
      const p = spendProgress(goal)
      if (p > 1) return 'negative'
      if (p >= 0.8) return 'warning'
      return 'primary'
    }

    const spendStatusClass = (goal) => spendProgress(goal) > 1 ? 'text-negative' : 'text-grey-7'

    const spendRemainingLabel = (goal) => {
      const remaining = (goal.target_amount || 0) - spentForGoal(goal)
      return remaining >= 0
        ? `$${formatCurrency(remaining)} left`
        : `over by $${formatCurrency(-remaining)}`
    }

    const goalCategoryName = (goal) => {
      const cat = categories.value.find(c => c.id === goal.category_id)
      return cat ? cat.name : 'Category'
    }

    const spendPeriodLabel = (goal) =>
      goal.target_start_date && goal.target_end_date ? formatTimePeriod(goal) : 'this month'

    const expenseCategoryOptions = computed(() => {
      const expense = categories.value.filter(c => c.type === 'expense')
      const byId = Object.fromEntries(expense.map(c => [c.id, c]))
      return expense
        .map(c => ({
          label: c.parent_id && byId[c.parent_id] ? `${byId[c.parent_id].name} › ${c.name}` : c.name,
          value: c.id
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    })

    const accountOptions = computed(() =>
      accounts.value.map(a => ({
        label: `${a.name} ($${formatCurrency(a.balance_current || 0)})`,
        value: a.id
      }))
    )

    const formatCurrency = (val) => {
      const num = Number(val) || 0
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const goalCurrentAmount = (goal) => {
      if (goal.linked_account_id) {
        const account = accounts.value.find(a => a.id === goal.linked_account_id)
        if (account) return Math.max(0, account.balance_current || 0)
      }
      return Math.max(0, goal.current_amount || 0)
    }

    const goalProgress = (goal) => {
      if (!goal.target_amount || goal.target_amount <= 0) return 0
      return Math.min(1, goalCurrentAmount(goal) / goal.target_amount)
    }

    const linkedAccountName = (goal) => {
      const account = accounts.value.find(a => a.id === goal.linked_account_id)
      return account ? account.name : 'Linked account'
    }

    const truncate = (str, len) => {
      if (!str) return ''
      return str.length <= len ? str : str.slice(0, len) + '...'
    }

    const formatTimePeriod = (goal) => {
      if (goal.target_date) {
        const d = new Date(goal.target_date)
        return 'By ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      if (goal.target_start_date && goal.target_end_date) {
        const start = new Date(goal.target_start_date)
        const end = new Date(goal.target_end_date)
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' – ' + end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return ''
    }

    const openLink = (url) => {
      if (url && (url.startsWith('http') || url.startsWith('https'))) {
        window.open(url, '_blank')
      } else if (url) {
        window.open('https://' + url, '_blank')
      }
    }

    const openAddDialog = () => {
      resetForm()
      dialogOpen.value = true
    }

    const openEditDialog = (goal) => {
      editingGoal.value = goal
      form.value = {
        title: goal.title,
        description: goal.description || '',
        mantra: goal.mantra || '',
        links: Array.isArray(goal.links) && goal.links.length
          ? goal.links.map(l => ({ url: l.url || '', label: l.label || '' }))
          : [],
        target_date: goal.target_date || null,
        target_start_date: goal.target_start_date || null,
        target_end_date: goal.target_end_date || null,
        target_amount: goal.target_amount ?? null,
        current_amount: goal.current_amount ?? null,
        linked_account_id: goal.linked_account_id || null,
        goal_type: goal.goal_type === 'spend_limit' ? 'spend_limit' : 'save',
        category_id: goal.category_id || null,
        pinned: !!goal.pinned
      }
      dialogOpen.value = true
    }

    const saveGoal = async () => {
      if (!form.value.title?.trim()) {
        $q.notify({ type: 'warning', message: 'Title is required' })
        return
      }
      const isLimit = form.value.goal_type === 'spend_limit'
      if (isLimit && (!form.value.category_id || !(form.value.target_amount > 0))) {
        $q.notify({ type: 'warning', message: 'Spending limits need a category and a limit amount' })
        return
      }
      const links = (form.value.links || [])
        .filter(l => l.url && l.url.trim())
        .map(l => ({ url: l.url.trim(), label: (l.label || '').trim() }))
      const payload = {
        title: form.value.title.trim(),
        description: (form.value.description || '').trim() || null,
        mantra: (form.value.mantra || '').trim() || null,
        links,
        target_date: form.value.target_date || null,
        target_start_date: form.value.target_start_date || null,
        target_end_date: form.value.target_end_date || null,
        target_amount: form.value.target_amount > 0 ? Number(form.value.target_amount) : null,
        current_amount: !isLimit && form.value.current_amount > 0 ? Number(form.value.current_amount) : null,
        linked_account_id: isLimit ? null : (form.value.linked_account_id || null),
        goal_type: isLimit ? 'spend_limit' : 'save',
        category_id: isLimit ? form.value.category_id : null,
        pinned: !!form.value.pinned
      }
      saving.value = true
      try {
        if (editingGoal.value) {
          await firebaseApi.updateGoal(editingGoal.value.id, payload)
          $q.notify({ type: 'positive', message: 'Goal updated' })
        } else {
          await firebaseApi.createGoal(payload)
          $q.notify({ type: 'positive', message: 'Goal added' })
        }
        dialogOpen.value = false
        resetForm()
        await loadGoals()
        await loadSpending()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to save goal' })
      } finally {
        saving.value = false
      }
    }

    const togglePin = async (goal) => {
      try {
        await firebaseApi.updateGoal(goal.id, { ...goal, pinned: !goal.pinned })
        await loadGoals()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to update' })
      }
    }

    const confirmDelete = (goal) => {
      goalToDelete.value = goal
      deleteDialogOpen.value = true
    }

    const doDelete = async () => {
      if (!goalToDelete.value) return
      deleting.value = true
      try {
        await firebaseApi.deleteGoal(goalToDelete.value.id)
        $q.notify({ type: 'positive', message: 'Goal deleted' })
        deleteDialogOpen.value = false
        goalToDelete.value = null
        await loadGoals()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.message || 'Failed to delete' })
      } finally {
        deleting.value = false
      }
    }

    // Day-by-day history of the banner: what you believed, and the number
    // that backed it. Loaded lazily; hides itself when empty.
    const beliefJournal = ref([])
    const journalOpen = ref(false)
    const loadBeliefJournal = async () => {
      try {
        beliefJournal.value = await firebaseApi.getBeliefJournal(14)
      } catch (err) {
        console.error('Error loading belief journal:', err)
      }
    }
    const journalDate = (day) => {
      const [y, m, d] = day.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    // Ground the daily mantra in real numbers: collect TRUE facts from the
    // forecast engine (met goal / kept streak / on-pace date / cap discipline /
    // the concrete lever) and rotate through them by day of year — the belief
    // layer wired to the user's actual data, not just words.
    const loadGroundedLine = async () => {
      try {
        // Minimal window — crossings/adherence compute over the full horizon anyway
        const today = new Date()
        const startDate = new Date(today.getTime() - 7 * 864e5).toISOString().split('T')[0]
        const endDate = new Date(today.getTime() + 7 * 864e5).toISOString().split('T')[0]
        const data = await firebaseApi.getForecastSeries({ startDate, endDate, grain: 'weekly' })
        const fmtDate = (d) => {
          const [y, m, day] = d.split('-').map(Number)
          return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }
        const lines = []
        const gs = data?.goals || []
        gs.filter(g => g.alreadyMet).forEach(g => {
          lines.push({ id: g.id, text: `\u{1F389} ${g.title} is fully funded \u2014 $${formatCurrency(g.target_amount)} is real, not a wish.` })
        })
        gs.filter(g => g.commitmentStatus && g.commitmentStatus.keptStreak >= 2).forEach(g => {
          lines.push({ id: g.id, text: `You've kept your ${g.title} plan ${g.commitmentStatus.keptStreak} weeks running \u2014 belief, backed by action.` })
        })
        gs.filter(g => !g.alreadyMet && g.crossDate && g.onTrack !== false).forEach(g => {
          lines.push({ id: g.id, text: `Your numbers agree: on pace to reach ${g.title} ($${formatCurrency(g.target_amount)}) on ${fmtDate(g.crossDate)}.` })
        })
        gs.filter(g => !g.alreadyMet && g.projection && g.projection.daily[0] > 0 && g.target_amount > 0).forEach(g => {
          const cur = g.projection.daily[0]
          const pct = Math.min(99, Math.round((cur / g.target_amount) * 100))
          if (pct >= 5) lines.push({ id: g.id, text: `You've already built $${formatCurrency(cur)} toward ${g.title} \u2014 ${pct}% of the way there.` })
        })
        ;(data?.spendLimits || []).filter(l => l.status === 'ok' && l.remaining > 0).forEach(l => {
          lines.push({ id: l.id, text: `Discipline is showing: ${l.category_name} is $${formatCurrency(l.remaining)} under its cap${l.defaultPeriod ? ' this month' : ''}.` })
        })
        gs.filter(g => !g.alreadyMet && g.coach && g.coach.requiredExtraPerMonth > 0).forEach(g => {
          lines.push({ id: g.id, text: `Make it true today: $${formatCurrency(g.coach.requiredExtraPerMonth)}/mo more puts ${g.title} back on track.` })
        })
        if (lines.length === 0) return
        const startOfYear = new Date(today.getFullYear(), 0, 0)
        const dayOfYear = Math.floor((today - startOfYear) / 864e5)
        // When the banner headlines a personal mantra, prefer a fact about THAT goal
        const preferred = personalMantra.value ? lines.filter(l => l.id === personalMantra.value.goalId) : []
        const pool = preferred.length ? preferred : lines
        groundedLine.value = pool[dayOfYear % pool.length].text
        // Journal today's belief + its evidence (fire-and-forget; a same-day
        // rerun just refreshes the fact)
        firebaseApi.saveBeliefEntry({
          mantra: personalMantra.value ? personalMantra.value.text : quoteOfTheDay.value,
          personal: !!personalMantra.value,
          goalId: personalMantra.value ? personalMantra.value.goalId : null,
          goalTitle: personalMantra.value ? personalMantra.value.goalTitle : null,
          fact: groundedLine.value
        }).then(loadBeliefJournal).catch(err => console.error('Error saving belief entry:', err))
      } catch (err) {
        // The grounded line is a bonus — never block or toast the vision board
        console.error('Error loading grounded mantra line:', err)
      }
    }

    onMounted(async () => {
      await Promise.all([loadGoals(), loadCategories(), loadAccounts()])
      loadSpending()
      loadGroundedLine()
      loadBeliefJournal()
    })

    return {
      quoteOfTheDay,
      personalMantra,
      groundedLine,
      beliefJournal,
      journalOpen,
      journalDate,
      goals,
      accounts,
      accountOptions,
      formatCurrency,
      goalCurrentAmount,
      goalProgress,
      linkedAccountName,
      isSpendLimit,
      spentForGoal,
      spendProgress,
      spendBarColor,
      spendStatusClass,
      spendRemainingLabel,
      goalCategoryName,
      spendPeriodLabel,
      expenseCategoryOptions,
      loading,
      saving,
      deleting,
      dialogOpen,
      deleteDialogOpen,
      editingGoal,
      form,
      openAddDialog,
      openEditDialog,
      saveGoal,
      togglePin,
      confirmDelete,
      doDelete,
      truncate,
      formatTimePeriod,
      openLink
    }
  }
})
</script>

<style scoped>
.goal-card-pinned {
  border-left: 4px solid #3BA99F;
}
.goal-description {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
