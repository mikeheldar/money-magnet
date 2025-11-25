<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Account Types & Categories</div>
          
          <q-table
            :rows="displayRows"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loading"
            :pagination="{ rowsPerPage: 0 }"
            class="account-types-table"
          >
            <template v-slot:top>
              <q-btn
                color="primary"
                icon="add"
                label="Add Category"
                @click="showAddCategory = true"
                class="q-mr-sm"
                size="sm"
              />
            </template>

            <template v-slot:body="props">
              <!-- Add Category Row -->
              <template v-if="showAddCategory && props.rowIndex === 0">
                <q-tr key="add-category-row">
                  <q-td colspan="4">
                    <div class="row q-col-gutter-sm items-center q-pa-sm">
                      <div class="col-3">
                        <q-input
                          v-model="editingCategory.name"
                          label="Category Name"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-4">
                        <q-input
                          v-model="editingCategory.description"
                          label="Description"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-3">
                        <q-input
                          v-model="newAccountType.name"
                          label="First Account Type Name"
                          dense
                          outlined
                          placeholder="Optional"
                        />
                      </div>
                      <div class="col-2">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onSaveCategory"
                          :loading="savingCategory"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelCategory"
                        />
                      </div>
                    </div>
                  </q-td>
                </q-tr>
              </template>

              <!-- Category Row -->
              <q-tr v-if="props.row.isCategory" :key="`category-${props.row.id}`" class="bg-grey-2">
                <q-td>
                  <div class="row items-center">
                    <q-icon name="folder" class="q-mr-sm" />
                    <span class="text-weight-bold">{{ props.row.name }}</span>
                  </div>
                </q-td>
                <q-td>
                  <span class="text-caption text-grey-7">{{ props.row.description || '-' }}</span>
                </q-td>
                <q-td>
                  <span class="text-caption">{{ props.row.typeCount || 0 }} types</span>
                </q-td>
                <q-td></q-td>
                <q-td>
                  <q-btn
                    flat
                    round
                    dense
                    icon="add"
                    color="primary"
                    size="sm"
                    @click="addTypeToCategory(props.row.id)"
                    title="Add Account Type"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    @click="editCategory(props.row)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="deleteCategory(props.row.id)"
                  />
                </q-td>
              </q-tr>

              <!-- Account Type Rows (children of category) -->
              <template v-if="props.row.isCategory">
                <q-tr
                  v-for="type in getTypesForCategory(props.row.id)"
                  :key="`type-${type.id}`"
                  class="account-type-row"
                >
                  <q-td>
                    <div class="row items-center" style="padding-left: 2rem;">
                      <q-icon name="label" class="q-mr-sm" size="sm" />
                      <template v-if="editingTypeId === type.id">
                        <q-input
                          v-model="editingAccountType.name"
                          dense
                          outlined
                          style="min-width: 150px;"
                        />
                      </template>
                      <template v-else>
                        {{ type.name }}
                      </template>
                    </div>
                  </q-td>
                  <q-td>
                    <template v-if="editingTypeId === type.id">
                      <q-input
                        v-model="editingAccountType.description"
                        dense
                        outlined
                        style="min-width: 200px;"
                      />
                    </template>
                    <template v-else>
                      <span class="text-caption text-grey-7">{{ type.description || '-' }}</span>
                    </template>
                  </q-td>
                  <q-td>
                    <span class="text-caption text-grey-7">{{ props.row.name }}</span>
                  </q-td>
                  <q-td>
                    <template v-if="editingTypeId === type.id">
                      <q-btn
                        flat
                        dense
                        icon="check"
                        color="positive"
                        @click="onSaveAccountType(type.id)"
                        :loading="savingType"
                      />
                      <q-btn
                        flat
                        dense
                        icon="close"
                        color="negative"
                        @click="cancelAccountType"
                      />
                    </template>
                    <template v-else>
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        @click="editAccountType(type)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteAccountType(type.id)"
                      />
                    </template>
                  </q-td>
                </q-tr>

                <!-- Add Type Row for this Category -->
                <q-tr v-if="addingTypeToCategoryId === props.row.id" key="add-type-row">
                  <q-td colspan="4">
                    <div class="row q-col-gutter-sm items-center q-pa-sm" style="padding-left: 2rem;">
                      <div class="col-4">
                        <q-input
                          v-model="newAccountType.name"
                          label="Account Type Name"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-5">
                        <q-input
                          v-model="newAccountType.description"
                          label="Description"
                          dense
                          outlined
                        />
                      </div>
                      <div class="col-3">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddAccountType(props.row.id)"
                          :loading="savingType"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelAddType"
                        />
                      </div>
                    </div>
                  </q-td>
                </q-tr>
              </template>

              <!-- Uncategorized Account Types -->
              <q-tr v-if="props.row.isUncategorized" :key="`uncategorized-${props.row.id}`" class="bg-grey-1">
                <q-td>
                  <div class="row items-center">
                    <q-icon name="help_outline" class="q-mr-sm" />
                    <span class="text-weight-medium text-grey-7">Uncategorized</span>
                  </div>
                </q-td>
                <q-td colspan="4">
                  <span class="text-caption text-grey-6">Account types without a category</span>
                </q-td>
              </q-tr>

              <!-- Uncategorized Type Rows -->
              <template v-if="props.row.isUncategorized">
                <q-tr
                  v-for="type in getUncategorizedTypes()"
                  :key="`type-${type.id}`"
                  class="account-type-row"
                >
                  <q-td>
                    <div class="row items-center" style="padding-left: 2rem;">
                      <q-icon name="label" class="q-mr-sm" size="sm" />
                      <template v-if="editingTypeId === type.id">
                        <q-input
                          v-model="editingAccountType.name"
                          dense
                          outlined
                          style="min-width: 150px;"
                        />
                      </template>
                      <template v-else>
                        {{ type.name }}
                      </template>
                    </div>
                  </q-td>
                  <q-td>
                    <template v-if="editingTypeId === type.id">
                      <q-input
                        v-model="editingAccountType.description"
                        dense
                        outlined
                        style="min-width: 200px;"
                      />
                    </template>
                    <template v-else>
                      <span class="text-caption text-grey-7">{{ type.description || '-' }}</span>
                    </template>
                  </q-td>
                  <q-td>
                    <q-select
                      v-if="editingTypeId === type.id"
                      v-model="editingAccountType.category_id"
                      :options="categoryOptions"
                      option-label="name"
                      option-value="id"
                      dense
                      outlined
                      emit-value
                      map-options
                      clearable
                      label="Category"
                    />
                    <span v-else class="text-caption text-grey-7">-</span>
                  </q-td>
                  <q-td>
                    <template v-if="editingTypeId === type.id">
                      <q-btn
                        flat
                        dense
                        icon="check"
                        color="positive"
                        @click="onSaveAccountType(type.id)"
                        :loading="savingType"
                      />
                      <q-btn
                        flat
                        dense
                        icon="close"
                        color="negative"
                        @click="cancelAccountType"
                      />
                    </template>
                    <template v-else>
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        @click="editAccountType(type)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteAccountType(type.id)"
                      />
                    </template>
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
  name: 'AccountTypesPage',
  setup() {
    const $q = useQuasar()
    const categories = ref([])
    const accountTypes = ref([])
    const loading = ref(false)
    const savingCategory = ref(false)
    const savingType = ref(false)
    const showAddCategory = ref(false)
    const addingTypeToCategoryId = ref(null)
    const editingTypeId = ref(null)
    
    const editingCategory = ref({
      id: null,
      name: '',
      description: ''
    })
    
    const editingAccountType = ref({
      id: null,
      name: '',
      code: '',
      description: '',
      category_id: null
    })

    const newAccountType = ref({
      name: '',
      code: '',
      description: '',
      category_id: null
    })

    const categoryOptions = computed(() => {
      return categories.value.map(c => ({ id: c.id, name: c.name }))
    })

    const columns = [
      { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
      { name: 'description', label: 'Description', field: 'description', align: 'left', sortable: false },
      { name: 'category', label: 'Category', field: 'category', align: 'left', sortable: false },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]

    const displayRows = computed(() => {
      const rows = []
      
      // Add categories
      categories.value.forEach(category => {
        rows.push({
          id: `category-${category.id}`,
          isCategory: true,
          ...category,
          typeCount: accountTypes.value.filter(t => t.category_id === category.id).length
        })
      })
      
      // Add uncategorized section if there are uncategorized types
      const uncategorizedTypes = accountTypes.value.filter(t => !t.category_id)
      if (uncategorizedTypes.length > 0) {
        rows.push({
          id: 'uncategorized',
          isUncategorized: true
        })
      }
      
      return rows
    })

    const getTypesForCategory = (categoryId) => {
      return accountTypes.value.filter(t => t.category_id === categoryId)
    }

    const getUncategorizedTypes = () => {
      return accountTypes.value.filter(t => !t.category_id)
    }

    const loadCategories = async () => {
      try {
        categories.value = await firebaseApi.getAccountTypeCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load categories'
        })
      }
    }

    const loadAccountTypes = async () => {
      try {
        accountTypes.value = await firebaseApi.getAccountTypes()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load account types'
        })
      }
    }

    const onSaveCategory = async () => {
      if (!editingCategory.value.name) {
        $q.notify({
          type: 'negative',
          message: 'Category name is required'
        })
        return
      }

      savingCategory.value = true
      try {
        let categoryId
        if (editingCategory.value.id) {
          await firebaseApi.updateAccountTypeCategory(editingCategory.value.id, editingCategory.value)
          categoryId = editingCategory.value.id
        } else {
          const newCategory = await api.createAccountTypeCategory(editingCategory.value)
          categoryId = newCategory.id
        }
        
        // If a new account type name was provided, create it
        if (newAccountType.value.name) {
          // Generate code from name if not provided
          const code = newAccountType.value.code || newAccountType.value.name.toLowerCase().replace(/\s+/g, '_')
          await firebaseApi.createAccountType({
            name: newAccountType.value.name,
            code: code,
            description: newAccountType.value.description || '',
            category_id: categoryId
          })
        }
        
        $q.notify({
          type: 'positive',
          message: 'Category saved successfully'
        })
        
        cancelCategory()
        await loadCategories()
        await loadAccountTypes()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to save category'
        })
      } finally {
        savingCategory.value = false
      }
    }

    const editCategory = (category) => {
      editingCategory.value = {
        id: category.id,
        name: category.name,
        description: category.description || ''
      }
      newAccountType.value = {
        name: '',
        code: '',
        description: '',
        category_id: category.id
      }
      showAddCategory.value = true
    }

    const cancelCategory = () => {
      showAddCategory.value = false
      editingCategory.value = {
        id: null,
        name: '',
        description: ''
      }
      newAccountType.value = {
        name: '',
        code: '',
        description: '',
        category_id: null
      }
    }

    const deleteCategory = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this category? Account types in this category will become uncategorized.',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteAccountTypeCategory(id)
          $q.notify({
            type: 'positive',
            message: 'Category deleted'
          })
          await loadCategories()
          await loadAccountTypes()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: err.response?.data?.error || 'Failed to delete category'
          })
        }
      })
    }

    const addTypeToCategory = (categoryId) => {
      addingTypeToCategoryId.value = categoryId
      newAccountType.value = {
        name: '',
        code: '',
        description: '',
        category_id: categoryId
      }
    }

    const cancelAddType = () => {
      addingTypeToCategoryId.value = null
      newAccountType.value = {
        name: '',
        code: '',
        description: '',
        category_id: null
      }
    }

    const onAddAccountType = async (categoryId) => {
      if (!newAccountType.value.name) {
        $q.notify({
          type: 'negative',
          message: 'Name is required'
        })
        return
      }

      savingType.value = true
      try {
        // Generate code from name if not provided
        const code = newAccountType.value.code || newAccountType.value.name.toLowerCase().replace(/\s+/g, '_')
        await api.createAccountType({
          name: newAccountType.value.name,
          code: code,
          description: newAccountType.value.description || '',
          category_id: categoryId
        })
        
        $q.notify({
          type: 'positive',
          message: 'Account type added successfully'
        })
        
        cancelAddType()
        await loadAccountTypes()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to add account type'
        })
      } finally {
        savingType.value = false
      }
    }

    const editAccountType = (type) => {
      editingTypeId.value = type.id
      editingAccountType.value = {
        id: type.id,
        name: type.name,
        code: type.code, // Keep code for backend, but don't show to user
        description: type.description || '',
        category_id: type.category_id
      }
    }

    const cancelAccountType = () => {
      editingTypeId.value = null
      editingAccountType.value = {
        id: null,
        name: '',
        code: '',
        description: '',
        category_id: null
      }
    }

    const onSaveAccountType = async (id) => {
      savingType.value = true
      try {
        // Auto-generate code from name if name changed (code is kept from original)
        const code = editingAccountType.value.code || editingAccountType.value.name.toLowerCase().replace(/\s+/g, '_')
          await firebaseApi.updateAccountType(id, {
          name: editingAccountType.value.name,
          code: code,
          description: editingAccountType.value.description || '',
          category_id: editingAccountType.value.category_id
        })
        
        $q.notify({
          type: 'positive',
          message: 'Account type updated successfully'
        })
        
        cancelAccountType()
        await loadAccountTypes()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Failed to update account type'
        })
      } finally {
        savingType.value = false
      }
    }

    const deleteAccountType = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this account type?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteAccountType(id)
          $q.notify({
            type: 'positive',
            message: 'Account type deleted'
          })
          await loadAccountTypes()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: err.response?.data?.error || 'Failed to delete account type'
          })
        }
      })
    }

    onMounted(async () => {
      loading.value = true
      await loadCategories()
      await loadAccountTypes()
      loading.value = false
    })

    return {
      categories,
      accountTypes,
      loading,
      savingCategory,
      savingType,
      showAddCategory,
      addingTypeToCategoryId,
      editingTypeId,
      editingCategory,
      editingAccountType,
      newAccountType,
      categoryOptions,
      columns,
      displayRows,
      getTypesForCategory,
      getUncategorizedTypes,
      loadCategories,
      loadAccountTypes,
      onSaveCategory,
      editCategory,
      cancelCategory,
      deleteCategory,
      addTypeToCategory,
      cancelAddType,
      onAddAccountType,
      editAccountType,
      cancelAccountType,
      onSaveAccountType,
      deleteAccountType
    }
  }
})
</script>

<style scoped>
.account-type-row {
  background-color: #fafafa;
}

.account-types-table .q-table tbody tr.account-type-row:hover {
  background-color: #f5f5f5;
}
</style>
