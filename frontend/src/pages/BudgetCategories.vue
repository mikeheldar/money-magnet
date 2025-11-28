<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Budget Categories</div>
          
          <q-table
            :rows="displayRows"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loading"
            :pagination="{ rowsPerPage: 0 }"
            class="budget-categories-table"
          >
            <template v-slot:top>
              <q-btn
                color="primary"
                icon="add"
                label="Add Category Group"
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
                      <div class="col-2">
                        <q-select
                          v-model="editingCategory.icon"
                          :options="categoryGroupIcons"
                          option-label="label"
                          option-value="name"
                          emit-value
                          map-options
                          label="Icon"
                          dense
                          outlined
                        >
                          <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                              <q-item-section avatar>
                                <q-icon :name="scope.opt.name" :style="{ color: scope.opt.color }" size="24px" />
                              </q-item-section>
                              <q-item-section>
                                <q-item-label>{{ scope.opt.label }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </template>
                          <template v-slot:selected>
                            <q-icon 
                              v-if="editingCategory.icon" 
                              :name="editingCategory.icon" 
                              :style="{ color: getIconColor(editingCategory.icon, 'group') }"
                              size="20px"
                              class="q-mr-xs"
                            />
                            <span v-else>Select Icon</span>
                          </template>
                        </q-select>
                      </div>
                      <div class="col-3">
                        <q-input
                          v-model="editingCategory.name"
                          label="Category Group Name"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-2">
                        <q-select
                          v-model="editingCategory.type"
                          :options="['income', 'expense']"
                          label="Type"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-3">
                        <q-input
                          v-model="editingCategory.description"
                          label="Description"
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

              <!-- Category Group Row (Income/Expense) -->
              <q-tr v-if="props.row.isCategoryGroup" :key="`category-${props.row.id}`" class="bg-grey-2">
                <q-td>
                  <div class="row items-center">
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      :icon="collapsedGroups[props.row.id] ? 'expand_more' : 'expand_less'"
                      @click="toggleGroup(props.row.id)"
                      class="q-mr-xs"
                    />
                    <q-icon 
                      :name="props.row.icon || 'folder'" 
                      :style="{ color: props.row.icon_color || '#757575' }"
                      size="24px"
                      class="q-mr-sm"
                    />
                    <span class="text-weight-bold">{{ props.row.name }}</span>
                    <q-badge :color="props.row.type === 'income' ? 'positive' : 'negative'" class="q-ml-sm">
                      {{ props.row.type }}
                    </q-badge>
                  </div>
                </q-td>
                <q-td>
                  <span class="text-caption text-grey-7">{{ props.row.description || '-' }}</span>
                </q-td>
                <q-td>
                  <span class="text-caption">{{ props.row.categoryCount || 0 }} categories</span>
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
                    @click="addCategoryToGroup(props.row.id, props.row.type)"
                    title="Add Category"
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

              <!-- Category Rows (children of category group) -->
              <template v-if="props.row.isCategoryGroup && !collapsedGroups[props.row.id]">
                <q-tr
                  v-for="cat in getCategoriesForGroup(props.row.id)"
                  :key="`cat-${cat.id}`"
                  class="category-row"
                >
                  <q-td>
                    <div class="row items-center" style="padding-left: 2rem;">
                      <q-icon 
                        :name="cat.icon || 'label'" 
                        :style="{ color: cat.icon_color || '#757575' }"
                        size="20px"
                        class="q-mr-sm"
                      />
                      <template v-if="editingCategoryId === cat.id">
                        <div class="row q-gutter-xs items-center">
                          <q-select
                            v-model="editingCategoryItem.icon"
                            :options="categoryIcons"
                            option-label="label"
                            option-value="name"
                            emit-value
                            map-options
                            dense
                            outlined
                            style="min-width: 120px;"
                          >
                            <template v-slot:option="scope">
                              <q-item v-bind="scope.itemProps">
                                <q-item-section avatar>
                                  <q-icon :name="scope.opt.name" :style="{ color: scope.opt.color }" size="20px" />
                                </q-item-section>
                                <q-item-section>
                                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                                </q-item-section>
                              </q-item>
                            </template>
                            <template v-slot:selected>
                              <q-icon 
                                v-if="editingCategoryItem.icon" 
                                :name="editingCategoryItem.icon" 
                                :style="{ color: getIconColor(editingCategoryItem.icon, 'category') }"
                                size="16px"
                                class="q-mr-xs"
                              />
                            </template>
                          </q-select>
                          <q-input
                            v-model="editingCategoryItem.name"
                            dense
                            outlined
                            style="min-width: 150px;"
                          />
                        </div>
                      </template>
                      <template v-else>
                        {{ cat.name }}
                      </template>
                    </div>
                  </q-td>
                  <q-td>
                    <template v-if="editingCategoryId === cat.id">
                      <q-input
                        v-model="editingCategoryItem.description"
                        dense
                        outlined
                        style="min-width: 200px;"
                      />
                    </template>
                    <template v-else>
                      <span class="text-caption text-grey-7">{{ cat.description || '-' }}</span>
                    </template>
                  </q-td>
                  <q-td>
                    <span class="text-caption text-grey-7">{{ props.row.name }}</span>
                  </q-td>
                  <q-td>
                    <template v-if="editingCategoryId === cat.id">
                      <q-btn
                        flat
                        dense
                        icon="check"
                        color="positive"
                        @click="onSaveCategoryItem(cat.id)"
                        :loading="savingCategory"
                      />
                      <q-btn
                        flat
                        dense
                        icon="close"
                        color="negative"
                        @click="cancelCategoryItem"
                      />
                    </template>
                    <template v-else>
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        @click="editCategoryItem(cat)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        @click="deleteCategoryItem(cat.id)"
                      />
                    </template>
                  </q-td>
                </q-tr>

                <!-- Add Category Row for this Group -->
                <q-tr v-if="addingCategoryToGroupId === props.row.id && !collapsedGroups[props.row.id]" key="add-cat-row">
                  <q-td colspan="4">
                    <div class="row q-col-gutter-sm items-center q-pa-sm" style="padding-left: 2rem;">
                      <div class="col-2">
                        <q-select
                          v-model="newCategoryItem.icon"
                          :options="categoryIcons"
                          option-label="label"
                          option-value="name"
                          emit-value
                          map-options
                          label="Icon"
                          dense
                          outlined
                        >
                          <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                              <q-item-section avatar>
                                <q-icon :name="scope.opt.name" :style="{ color: scope.opt.color }" size="24px" />
                              </q-item-section>
                              <q-item-section>
                                <q-item-label>{{ scope.opt.label }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </template>
                          <template v-slot:selected>
                            <q-icon 
                              v-if="newCategoryItem.icon" 
                              :name="newCategoryItem.icon" 
                              :style="{ color: getIconColor(newCategoryItem.icon, 'category') }"
                              size="20px"
                              class="q-mr-xs"
                            />
                            <span v-else>Select Icon</span>
                          </template>
                        </q-select>
                      </div>
                      <div class="col-4">
                        <q-input
                          v-model="newCategoryItem.name"
                          label="Category Name"
                          dense
                          outlined
                          :rules="[val => !!val || 'Required']"
                        />
                      </div>
                      <div class="col-4">
                        <q-input
                          v-model="newCategoryItem.description"
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
                          @click="onAddCategoryItem(props.row.id, props.row.type)"
                          :loading="savingCategory"
                        />
                        <q-btn
                          flat
                          dense
                          icon="close"
                          color="negative"
                          @click="cancelAddCategoryItem"
                        />
                      </div>
                    </div>
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
import { categoryIcons, categoryGroupIcons, getIconByName } from '../utils/category-icons'

export default defineComponent({
  name: 'BudgetCategoriesPage',
  setup() {
    const $q = useQuasar()
    const categories = ref([])
    const loading = ref(false)
    const savingCategory = ref(false)
    const showAddCategory = ref(false)
    const addingCategoryToGroupId = ref(null)
    const editingCategoryId = ref(null)
    const collapsedGroups = ref({})
    
    const editingCategory = ref({
      id: null,
      name: '',
      type: 'expense',
      description: '',
      icon: null,
      icon_color: null
    })
    
    const editingCategoryItem = ref({
      id: null,
      name: '',
      description: '',
      parent_id: null,
      type: 'expense',
      icon: null,
      icon_color: null
    })

    const newCategoryItem = ref({
      name: '',
      description: '',
      parent_id: null,
      type: 'expense',
      icon: null,
      icon_color: null
    })

    const toggleGroup = (groupId) => {
      collapsedGroups.value[groupId] = !collapsedGroups.value[groupId]
    }

    const getIconColor = (iconName, type = 'category') => {
      if (!iconName) return '#757575'
      const icon = getIconByName(iconName)
      return icon ? icon.color : '#757575'
    }

    const columns = [
      { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
      { name: 'description', label: 'Description', field: 'description', align: 'left', sortable: false },
      { name: 'group', label: 'Group', field: 'group', align: 'left', sortable: false },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false }
    ]

    const displayRows = computed(() => {
      const rows = []
      
      // Group categories by type and parent
      const incomeGroups = categories.value.filter(c => c.type === 'income' && !c.parent_id)
      const expenseGroups = categories.value.filter(c => c.type === 'expense' && !c.parent_id)
      
      // Add Income groups
      incomeGroups.forEach(group => {
        rows.push({
          id: `group-${group.id}`,
          isCategoryGroup: true,
          ...group,
          categoryCount: categories.value.filter(c => c.parent_id === group.id).length
        })
      })
      
      // Add Expense groups
      expenseGroups.forEach(group => {
        rows.push({
          id: `group-${group.id}`,
          isCategoryGroup: true,
          ...group,
          categoryCount: categories.value.filter(c => c.parent_id === group.id).length
        })
      })
      
      return rows
    })

    const getCategoriesForGroup = (groupId) => {
      return categories.value.filter(c => c.parent_id === groupId)
    }

    const loadCategories = async () => {
      loading.value = true
      try {
        categories.value = await firebaseApi.getCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load categories'
        })
      } finally {
        loading.value = false
      }
    }

    const onSaveCategory = async () => {
      if (!editingCategory.value.name || !editingCategory.value.type) {
        $q.notify({
          type: 'negative',
          message: 'Name and type are required'
        })
        return
      }

      savingCategory.value = true
      try {
        const categoryData = {
          ...editingCategory.value,
          icon_color: editingCategory.value.icon ? getIconColor(editingCategory.value.icon, 'group') : null
        }
        if (editingCategory.value.id) {
          await firebaseApi.updateCategory(editingCategory.value.id, categoryData)
        } else {
          await firebaseApi.createCategory(categoryData)
        }
        
        $q.notify({
          type: 'positive',
          message: 'Category group saved successfully'
        })
        
        cancelCategory()
        await loadCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to save category group'
        })
      } finally {
        savingCategory.value = false
      }
    }

    const editCategory = (category) => {
      editingCategory.value = {
        id: category.id,
        name: category.name,
        type: category.type,
        description: category.description || '',
        icon: category.icon || null,
        icon_color: category.icon_color || null
      }
      showAddCategory.value = true
    }

    const cancelCategory = () => {
      showAddCategory.value = false
      editingCategory.value = {
        id: null,
        name: '',
        type: 'expense',
        description: '',
        icon: null,
        icon_color: null
      }
    }

    const deleteCategory = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this category group? Categories in this group will become uncategorized.',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteCategory(id)
          $q.notify({
            type: 'positive',
            message: 'Category group deleted'
          })
          await loadCategories()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: err.message || 'Failed to delete category group'
          })
        }
      })
    }

    const addCategoryToGroup = (groupId, type) => {
      addingCategoryToGroupId.value = groupId
      newCategoryItem.value = {
        name: '',
        description: '',
        parent_id: groupId,
        type: type
      }
    }

    const cancelAddCategoryItem = () => {
      addingCategoryToGroupId.value = null
      newCategoryItem.value = {
        name: '',
        description: '',
        parent_id: null,
        type: 'expense',
        icon: null,
        icon_color: null
      }
    }

    const onAddCategoryItem = async (groupId, type) => {
      if (!newCategoryItem.value.name) {
        $q.notify({
          type: 'negative',
          message: 'Name is required'
        })
        return
      }

      savingCategory.value = true
      try {
        await firebaseApi.createCategory({
          name: newCategoryItem.value.name,
          description: newCategoryItem.value.description || '',
          parent_id: groupId,
          type: type,
          icon: newCategoryItem.value.icon || null,
          icon_color: newCategoryItem.value.icon ? getIconColor(newCategoryItem.value.icon, 'category') : null
        })
        
        $q.notify({
          type: 'positive',
          message: 'Category added successfully'
        })
        
        cancelAddCategoryItem()
        await loadCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to add category'
        })
      } finally {
        savingCategory.value = false
      }
    }

    const editCategoryItem = (category) => {
      editingCategoryId.value = category.id
      editingCategoryItem.value = {
        id: category.id,
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id,
        type: category.type,
        icon: category.icon || null,
        icon_color: category.icon_color || null
      }
    }

    const cancelCategoryItem = () => {
      editingCategoryId.value = null
      editingCategoryItem.value = {
        id: null,
        name: '',
        description: '',
        parent_id: null,
        type: 'expense',
        icon: null,
        icon_color: null
      }
    }

    const onSaveCategoryItem = async (id) => {
      savingCategory.value = true
      try {
        await firebaseApi.updateCategory(id, {
          name: editingCategoryItem.value.name,
          description: editingCategoryItem.value.description || '',
          parent_id: editingCategoryItem.value.parent_id,
          type: editingCategoryItem.value.type,
          icon: editingCategoryItem.value.icon || null,
          icon_color: editingCategoryItem.value.icon ? getIconColor(editingCategoryItem.value.icon, 'category') : null
        })
        
        $q.notify({
          type: 'positive',
          message: 'Category updated successfully'
        })
        
        cancelCategoryItem()
        await loadCategories()
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: err.message || 'Failed to update category'
        })
      } finally {
        savingCategory.value = false
      }
    }

    const deleteCategoryItem = async (id) => {
      $q.dialog({
        title: 'Confirm',
        message: 'Are you sure you want to delete this category?',
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await firebaseApi.deleteCategory(id)
          $q.notify({
            type: 'positive',
            message: 'Category deleted'
          })
          await loadCategories()
        } catch (err) {
          $q.notify({
            type: 'negative',
            message: err.message || 'Failed to delete category'
          })
        }
      })
    }

    onMounted(async () => {
      await loadCategories()
    })

    return {
      categories,
      loading,
      savingCategory,
      showAddCategory,
      addingCategoryToGroupId,
      editingCategoryId,
      editingCategory,
      editingCategoryItem,
      newCategoryItem,
      collapsedGroups,
      categoryIcons,
      categoryGroupIcons,
      columns,
      displayRows,
      getCategoriesForGroup,
      toggleGroup,
      getIconColor,
      loadCategories,
      onSaveCategory,
      editCategory,
      cancelCategory,
      deleteCategory,
      addCategoryToGroup,
      cancelAddCategoryItem,
      onAddCategoryItem,
      editCategoryItem,
      cancelCategoryItem,
      onSaveCategoryItem,
      deleteCategoryItem
    }
  }
})
</script>

<style scoped>
.category-row {
  background-color: #fafafa;
}

.budget-categories-table .q-table tbody tr.category-row:hover {
  background-color: #f5f5f5;
}
</style>


