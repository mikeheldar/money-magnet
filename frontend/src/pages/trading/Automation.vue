<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Automation</div>
          <div class="text-caption text-grey-7 q-mb-lg">
            Manage automated workflows and rules for your finances
          </div>

          <!-- N8N Status -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-sm">
                <q-icon name="settings_ethernet" size="md" class="q-mr-sm" />
                <div class="text-h6">N8N Integration</div>
                <q-space />
                <q-chip :color="n8nConnected ? 'positive' : 'negative'" text-color="white">
                  {{ n8nConnected ? 'Connected' : 'Not Connected' }}
                </q-chip>
              </div>
              <div class="text-caption text-grey-7 q-mb-md">
                N8N webhook URL: {{ n8nWebhookUrl || 'Not configured' }}
              </div>
              <q-btn 
                v-if="!n8nConnected"
                color="primary" 
                label="Configure N8N"
                @click="showN8NConfig = true"
              />
            </q-card-section>
          </q-card>

          <!-- Automation Rules -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-sm">
                <q-icon name="rule" class="q-mr-sm" />
                Automation Rules
              </div>
              
              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="category" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Auto-Categorize Transactions</q-item-label>
                    <q-item-label caption>Automatically categorize new transactions using AI</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle 
                      v-model="rules.autoCategorize" 
                      @update:model-value="updateRule('autoCategorize', $event)"
                    />
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="notifications" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Budget Alerts</q-item-label>
                    <q-item-label caption>Get notified when you exceed budget limits</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle 
                      v-model="rules.budgetAlerts" 
                      @update:model-value="updateRule('budgetAlerts', $event)"
                    />
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="security" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Anomaly Detection</q-item-label>
                    <q-item-label caption>Alert on unusual spending patterns</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle 
                      v-model="rules.anomalyDetection" 
                      @update:model-value="updateRule('anomalyDetection', $event)"
                    />
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="sync" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Recurring Transaction Detection</q-item-label>
                    <q-item-label caption>Automatically detect and categorize recurring transactions</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle 
                      v-model="rules.recurringDetection" 
                      @update:model-value="updateRule('recurringDetection', $event)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Custom Workflows -->
          <q-card flat bordered>
            <q-card-section>
              <div class="row items-center q-mb-sm">
                <div class="text-h6">
                  <q-icon name="account_tree" class="q-mr-sm" />
                  Custom Workflows
                </div>
                <q-space />
                <q-btn 
                  color="primary" 
                  icon="add" 
                  label="Create Workflow"
                  @click="showCreateWorkflow = true"
                />
              </div>

              <div v-if="workflows.length === 0" class="text-center q-pa-lg text-grey-7">
                No custom workflows yet. Create one to get started.
              </div>

              <q-list v-else>
                <q-item v-for="workflow in workflows" :key="workflow.id">
                  <q-item-section avatar>
                    <q-icon :name="workflow.active ? 'play_circle' : 'pause_circle'" 
                            :color="workflow.active ? 'positive' : 'grey'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ workflow.name }}</q-item-label>
                    <q-item-label caption>{{ workflow.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn 
                      flat 
                      dense 
                      icon="edit"
                      @click="editWorkflow(workflow)"
                    />
                    <q-btn 
                      flat 
                      dense 
                      icon="delete"
                      color="negative"
                      @click="deleteWorkflow(workflow.id)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>

      <!-- N8N Configuration Dialog -->
      <q-dialog v-model="showN8NConfig">
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Configure N8N</div>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="n8nWebhookUrl"
              label="N8N Webhook Base URL"
              hint="e.g., https://your-n8n-instance.com/webhook"
              outlined
            />
            <div class="text-caption text-grey-7 q-mt-sm">
              Set this in Firebase Functions config: firebase functions:config:set n8n.webhook_url="YOUR_URL"
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn flat label="Save" color="primary" v-close-popup @click="saveN8NConfig" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Create Workflow Dialog -->
      <q-dialog v-model="showCreateWorkflow">
        <q-card style="min-width: 500px">
          <q-card-section>
            <div class="text-h6">Create Workflow</div>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="newWorkflow.name"
              label="Workflow Name"
              outlined
              class="q-mb-sm"
            />
            <q-input
              v-model="newWorkflow.description"
              label="Description"
              outlined
              type="textarea"
              rows="3"
              class="q-mb-sm"
            />
            <q-select
              v-model="newWorkflow.trigger"
              :options="triggerOptions"
              label="Trigger"
              outlined
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn flat label="Create" color="primary" v-close-popup @click="createWorkflow" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../../services/firebase-api'

export default defineComponent({
  name: 'AutomationPage',
  setup() {
    const $q = useQuasar()
    const n8nConnected = ref(false)
    const n8nWebhookUrl = ref('')
    const showN8NConfig = ref(false)
    const showCreateWorkflow = ref(false)
    
    const rules = ref({
      autoCategorize: true,
      budgetAlerts: true,
      anomalyDetection: true,
      recurringDetection: true
    })

    const workflows = ref([])
    const newWorkflow = ref({
      name: '',
      description: '',
      trigger: 'transaction_created'
    })

    const triggerOptions = [
      { label: 'New Transaction Created', value: 'transaction_created' },
      { label: 'Budget Exceeded', value: 'budget_exceeded' },
      { label: 'Large Transaction', value: 'large_transaction' },
      { label: 'Daily Summary', value: 'daily_summary' }
    ]

    const loadAutomationSettings = async () => {
      try {
        // Load automation rules from Firestore
        const settings = await firebaseApi.getAutomationSettings()
        if (settings) {
          rules.value = { ...rules.value, ...settings.rules }
          n8nWebhookUrl.value = settings.n8n_webhook_url || ''
          n8nConnected.value = !!settings.n8n_webhook_url
        }
        
        // Load workflows
        const workflowsList = await firebaseApi.getWorkflows()
        workflows.value = workflowsList || []
      } catch (err) {
        console.error('Failed to load automation settings:', err)
      }
    }

    const updateRule = async (ruleName, value) => {
      try {
        await firebaseApi.updateAutomationRule(ruleName, value)
        $q.notify({
          type: 'positive',
          message: 'Rule updated successfully'
        })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to update rule'
        })
      }
    }

    const saveN8NConfig = () => {
      // This would typically update Firebase config
      // For now, just show a message
      $q.notify({
        type: 'info',
        message: 'Configure N8N URL in Firebase Functions: firebase functions:config:set n8n.webhook_url="YOUR_URL"'
      })
    }

    const createWorkflow = async () => {
      if (!newWorkflow.value.name) {
        $q.notify({
          type: 'negative',
          message: 'Workflow name is required'
        })
        return
      }

      try {
        const workflow = await firebaseApi.createWorkflow(newWorkflow.value)
        workflows.value.push(workflow)
        newWorkflow.value = { name: '', description: '', trigger: 'transaction_created' }
        $q.notify({
          type: 'positive',
          message: 'Workflow created successfully'
        })
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to create workflow'
        })
      }
    }

    const editWorkflow = (workflow) => {
      // TODO: Implement workflow editing
      $q.notify({
        type: 'info',
        message: 'Workflow editing coming soon'
      })
    }

    const deleteWorkflow = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this workflow?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteWorkflow(id)
          workflows.value = workflows.value.filter(w => w.id !== id)
          $q.notify({
            type: 'positive',
            message: 'Workflow deleted'
          })
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: 'Failed to delete workflow'
          })
        }
      })
    }

    onMounted(() => {
      loadAutomationSettings()
    })

    return {
      n8nConnected,
      n8nWebhookUrl,
      showN8NConfig,
      showCreateWorkflow,
      rules,
      workflows,
      newWorkflow,
      triggerOptions,
      updateRule,
      saveN8NConfig,
      createWorkflow,
      editWorkflow,
      deleteWorkflow
    }
  }
})
</script>

<style scoped>
.q-card {
  margin-bottom: 16px;
}
</style>

