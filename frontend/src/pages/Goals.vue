<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <!-- Daily quote / mantra banner -->
        <q-card class="q-mb-md" style="border-left: 4px solid #3BA99F;">
          <q-card-section class="bg-grey-1">
            <div class="text-caption text-grey-7 q-mb-xs">Daily mantra</div>
            <div class="text-h6" style="color: #2c3e50;">{{ quoteOfTheDay }}</div>
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
                        <div v-if="goal.target_date || (goal.target_start_date && goal.target_end_date)" class="text-caption text-grey-7 q-mb-sm">
                          {{ formatTimePeriod(goal) }}
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
    const dialogOpen = ref(false)
    const deleteDialogOpen = ref(false)
    const editingGoal = ref(null)
    const goalToDelete = ref(null)

    const quoteOfTheDay = computed(() => getQuoteOfTheDay())

    const form = ref({
      title: '',
      description: '',
      links: [],
      target_date: null,
      target_start_date: null,
      target_end_date: null,
      pinned: false
    })

    const resetForm = () => {
      form.value = {
        title: '',
        description: '',
        links: [],
        target_date: null,
        target_start_date: null,
        target_end_date: null,
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
        links: Array.isArray(goal.links) && goal.links.length
          ? goal.links.map(l => ({ url: l.url || '', label: l.label || '' }))
          : [],
        target_date: goal.target_date || null,
        target_start_date: goal.target_start_date || null,
        target_end_date: goal.target_end_date || null,
        pinned: !!goal.pinned
      }
      dialogOpen.value = true
    }

    const saveGoal = async () => {
      if (!form.value.title?.trim()) {
        $q.notify({ type: 'warning', message: 'Title is required' })
        return
      }
      const links = (form.value.links || [])
        .filter(l => l.url && l.url.trim())
        .map(l => ({ url: l.url.trim(), label: (l.label || '').trim() }))
      const payload = {
        title: form.value.title.trim(),
        description: (form.value.description || '').trim() || null,
        links,
        target_date: form.value.target_date || null,
        target_start_date: form.value.target_start_date || null,
        target_end_date: form.value.target_end_date || null,
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

    onMounted(() => {
      loadGoals()
    })

    return {
      quoteOfTheDay,
      goals,
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
