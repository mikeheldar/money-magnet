<template>
  <q-page padding>
    <div class="col-12">
      <q-card style="border-radius: 12px;">
        <q-card-section>
          <div class="text-h5 q-mb-md" style="color: #3BA99F; font-weight: 600;">Budget Categories</div>
          
          <div class="row items-center q-gutter-sm q-mb-md">
              <q-btn
                color="primary"
                icon="add"
                label="Add Category Group"
                @click="showAddCategory = true"
                size="sm"
              />
              <q-btn
                color="accent"
                icon="auto_awesome"
                label="Seed Categories with Icons"
                @click="seedCategories"
                :loading="seeding"
                size="sm"
              />
          </div>

          <!-- Add Category Form -->
            <q-card v-if="showAddCategory" class="q-mb-md">
              <q-card-section>
                <div class="row q-col-gutter-sm items-center">
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
              </q-card-section>
          </q-card>

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
            <template v-slot:body="props">
              <!-- Add Category Row -->
              <template v-if="showAddCategory && props.rowIndex === 0">
                <q-tr key="add-category-row">
                  <q-td colspan="5">
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
              <q-tr v-if="props.row.isCategoryGroup" :key="`category-${props.row.id}`" :data-group-id="props.row.id" class="bg-grey-2" style="cursor: move;">
                <q-td>
                  <div class="row items-center">
                    <div class="drag-handle" style="cursor: move; display: inline-flex; align-items: center;">
                      <q-icon name="drag_indicator" class="q-mr-xs text-grey-6" size="20px" />
                    </div>
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      :icon="collapsedGroups[props.row.id] ? 'expand_more' : 'expand_less'"
                      @click.stop="toggleGroup(props.row.id)"
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
                    @click="addCategoryToGroup(props.row.id.replace('group-', ''), props.row.type)"
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
                    @click="deleteCategory(props.row.id.replace('group-', ''))"
                  />
                </q-td>
              </q-tr>

              <!-- Category Rows (children of category group) -->
              <template v-if="props.row.isCategoryGroup && !collapsedGroups[props.row.id]">
                <q-tr
                  v-for="cat in getCategoriesForGroup(props.row.id.replace('group-', ''))"
                  :key="`cat-${cat.id}`"
                  class="category-row"
                  :data-category-id="cat.id"
                  :data-group-id="props.row.id"
                >
                  <q-td>
                    <div class="row items-center" style="padding-left: 2rem;">
                      <div class="category-drag-handle" style="cursor: move; display: inline-flex; align-items: center;">
                        <q-icon name="drag_indicator" class="q-mr-xs text-grey-6" size="16px" />
                      </div>
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
                <q-tr v-if="addingCategoryToGroupId === props.row.id.replace('group-', '')" key="add-cat-row">
                  <q-td colspan="5">
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
                      <div class="col-2">
                        <q-btn
                          flat
                          dense
                          icon="check"
                          color="positive"
                          @click="onAddCategoryItem(props.row.id.replace('group-', ''), props.row.type)"
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
import { defineComponent, ref, onMounted, computed, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import firebaseApi from '../services/firebase-api'
import { categoryIcons, categoryGroupIcons, getIconByName } from '../utils/category-icons'
import Sortable from 'sortablejs'

const categoryStructure = {
  expense: [
    {
      group: { name: 'Food & Dining', icon: 'restaurant', type: 'expense' },
      categories: [
        { name: 'Restaurants', icon: 'restaurant' },
        { name: 'Fast Food', icon: 'fastfood' },
        { name: 'Coffee', icon: 'coffee' },
        { name: 'Groceries', icon: 'grocery_store' },
        { name: 'Dining Out', icon: 'lunch_dining' },
        { name: 'Drinks', icon: 'local_bar' },
        { name: 'Dessert', icon: 'cake' }
      ]
    },
    {
      group: { name: 'Shopping', icon: 'shopping_cart', type: 'expense' },
      categories: [
        { name: 'Retail', icon: 'shopping_bag' },
        { name: 'Online Shopping', icon: 'shopping_cart' },
        { name: 'Clothing', icon: 'shopping_bag' },
        { name: 'Electronics', icon: 'shopping_cart' }
      ]
    },
    {
      group: { name: 'Transportation', icon: 'directions_car', type: 'expense' },
      categories: [
        { name: 'Gas', icon: 'local_gas_station' },
        { name: 'Parking', icon: 'directions_car' },
        { name: 'Public Transit', icon: 'directions_car' },
        { name: 'Rideshare', icon: 'directions_car' }
      ]
    },
    {
      group: { name: 'Home & Utilities', icon: 'home', type: 'expense' },
      categories: [
        { name: 'Rent/Mortgage', icon: 'home' },
        { name: 'Electricity', icon: 'electric_bolt' },
        { name: 'Water', icon: 'water_drop' },
        { name: 'Heating', icon: 'local_fire_department' },
        { name: 'Internet', icon: 'wifi' },
        { name: 'Phone', icon: 'phone' },
        { name: 'Maintenance', icon: 'home' }
      ]
    },
    {
      group: { name: 'Entertainment', icon: 'movie', type: 'expense' },
      categories: [
        { name: 'Movies', icon: 'movie' },
        { name: 'Music', icon: 'music_note' },
        { name: 'Gaming', icon: 'sports_esports' },
        { name: 'Theater', icon: 'theater_comedy' },
        { name: 'Sports Events', icon: 'sports_soccer' },
        { name: 'Leisure', icon: 'beach_access' }
      ]
    },
    {
      group: { name: 'Health & Fitness', icon: 'fitness_center', type: 'expense' },
      categories: [
        { name: 'Gym', icon: 'fitness_center' },
        { name: 'Medical', icon: 'local_hospital' },
        { name: 'Pharmacy', icon: 'local_hospital' },
        { name: 'Beauty', icon: 'spa' },
        { name: 'Haircut', icon: 'cut' }
      ]
    },
    {
      group: { name: 'Personal Care', icon: 'spa', type: 'expense' },
      categories: [
        { name: 'Beauty Products', icon: 'spa' },
        { name: 'Hair Care', icon: 'cut' },
        { name: 'Laundry', icon: 'dry_cleaning' }
      ]
    },
    {
      group: { name: 'Education', icon: 'school', type: 'expense' },
      categories: [
        { name: 'Tuition', icon: 'school' },
        { name: 'Books', icon: 'book' },
        { name: 'Supplies', icon: 'school' }
      ]
    },
    {
      group: { name: 'Travel', icon: 'flight', type: 'expense' },
      categories: [
        { name: 'Flights', icon: 'flight' },
        { name: 'Hotels', icon: 'home' },
        { name: 'Vacation', icon: 'beach_access' }
      ]
    },
    {
      group: { name: 'Bills & Services', icon: 'receipt', type: 'expense' },
      categories: [
        { name: 'Bills', icon: 'receipt' },
        { name: 'Subscriptions', icon: 'receipt' },
        { name: 'Insurance', icon: 'receipt' }
      ]
    },
    {
      group: { name: 'Gifts & Donations', icon: 'card_giftcard', type: 'expense' },
      categories: [
        { name: 'Gifts', icon: 'card_giftcard' },
        { name: 'Donations', icon: 'favorite' },
        { name: 'Celebrations', icon: 'celebration' }
      ]
    },
    {
      group: { name: 'Pets', icon: 'pets', type: 'expense' },
      categories: [
        { name: 'Pet Food', icon: 'pets' },
        { name: 'Veterinary', icon: 'pets' },
        { name: 'Pet Supplies', icon: 'pets' }
      ]
    }
  ],
  income: [
    {
      group: { name: 'Salary & Wages', icon: 'work', type: 'income' },
      categories: [
        { name: 'Salary', icon: 'work' },
        { name: 'Wages', icon: 'work' },
        { name: 'Bonus', icon: 'emoji_events' }
      ]
    },
    {
      group: { name: 'Investment Income', icon: 'trending_up', type: 'income' },
      categories: [
        { name: 'Dividends', icon: 'trending_up' },
        { name: 'Interest', icon: 'trending_up' },
        { name: 'Capital Gains', icon: 'trending_up' }
      ]
    },
    {
      group: { name: 'Other Income', icon: 'attach_money', type: 'income' },
      categories: [
        { name: 'Freelance', icon: 'work' },
        { name: 'Gifts Received', icon: 'card_giftcard' },
        { name: 'Refunds', icon: 'attach_money' }
      ]
    }
  ]
}

export default defineComponent({
  name: 'BudgetCategoriesPage',
  setup() {
    const $q = useQuasar()
    const categories = ref([])
    const loading = ref(false)
    const savingCategory = ref(false)
    const seeding = ref(false)
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
      if (collapsedGroups.value[groupId] === undefined) {
        collapsedGroups.value[groupId] = false
      }
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

    const expenseGroups = computed({
      get() {
        return categories.value
          .filter(c => c.type === 'expense' && !c.parent_id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(group => ({
            id: `group-${group.id}`,
            isCategoryGroup: true,
            ...group,
            categoryCount: categories.value.filter(c => c.parent_id === group.id).length
          }))
      },
      set(newValue) {
        // Update sort_order when groups are reordered
        updateGroupOrder(newValue, 'expense')
      }
    })

    const incomeGroups = computed({
      get() {
        return categories.value
          .filter(c => c.type === 'income' && !c.parent_id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(group => ({
            id: `group-${group.id}`,
            isCategoryGroup: true,
            ...group,
            categoryCount: categories.value.filter(c => c.parent_id === group.id).length
          }))
      },
      set(newValue) {
        // Update sort_order when groups are reordered
        updateGroupOrder(newValue, 'income')
      }
    })

    const displayRows = computed(() => {
      const rows = []
      
      // Add Expense groups
      expenseGroups.value.forEach(group => {
        rows.push(group)
      })
      
      // Add Income groups
      incomeGroups.value.forEach(group => {
        rows.push(group)
      })
      
      return rows
    })

    const getCategoriesForGroup = (groupId) => {
      return categories.value
        .filter(c => c.parent_id === groupId)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }

    const updateGroupOrder = async (newOrder, type) => {
      try {
        const updates = newOrder.map((group, index) => {
          const groupId = group.id.replace('group-', '')
          return firebaseApi.updateCategory(groupId, { sort_order: index })
        })
        await Promise.all(updates)
        await loadCategories()
      } catch (error) {
        console.error('Error updating group order:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to save new order'
        })
      }
    }

    const onGroupDragEnd = async (type) => {
      // Order is already updated via computed setter
      // Just reload to ensure consistency
      await loadCategories()
    }

    const onTableDragEnd = async () => {
      // Update order for all groups based on their position
      try {
        const expenseGroupsList = displayRows.value.filter(r => r.isCategoryGroup && r.type === 'expense')
        const incomeGroupsList = displayRows.value.filter(r => r.isCategoryGroup && r.type === 'income')
        
        const updates = []
        expenseGroupsList.forEach((group, index) => {
          const groupId = group.id.replace('group-', '')
          updates.push(firebaseApi.updateCategory(groupId, { sort_order: index }))
        })
        incomeGroupsList.forEach((group, index) => {
          const groupId = group.id.replace('group-', '')
          updates.push(firebaseApi.updateCategory(groupId, { sort_order: index }))
        })
        
        await Promise.all(updates)
        await loadCategories()
      } catch (error) {
        console.error('Error updating group order:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to save new order'
        })
      }
    }

    const onCategoryDragEnd = async (groupId) => {
      try {
        const groupCategories = getCategoriesForGroup(groupId)
        const updates = groupCategories.map((cat, index) => {
          return firebaseApi.updateCategory(cat.id, { sort_order: index })
        })
        await Promise.all(updates)
        await loadCategories()
      } catch (error) {
        console.error('Error updating category order:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to save new order'
        })
      }
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

    const seedCategories = async () => {
      const confirmed = await new Promise((resolve) => {
        $q.dialog({
          title: 'Seed Categories?',
          message: 'This will create category groups and categories with colorful icons. Existing categories will be skipped.',
          cancel: true,
          persistent: true
        }).onOk(() => resolve(true)).onCancel(() => resolve(false))
      })

      if (!confirmed) return

      seeding.value = true
      try {
        const existingCategories = await firebaseApi.getCategories()
        
        let createdCount = 0
        let skippedCount = 0

        for (const type of ['expense', 'income']) {
          for (const groupData of categoryStructure[type]) {
            const existingGroup = existingCategories.find(
              c => c.name === groupData.group.name && !c.parent_id && c.type === type
            )

            let groupId
            if (existingGroup) {
              groupId = existingGroup.id
              skippedCount++
            } else {
              const group = await firebaseApi.createCategory({
                name: groupData.group.name,
                type: groupData.group.type,
                icon: groupData.group.icon,
                icon_color: getIconColor(groupData.group.icon, 'group'),
                description: '',
                parent_id: null
              })
              groupId = group.id
              createdCount++
            }

            for (const categoryData of groupData.categories) {
              const existingCategory = existingCategories.find(
                c => c.name === categoryData.name && c.parent_id === groupId
              )

              if (!existingCategory) {
                await firebaseApi.createCategory({
                  name: categoryData.name,
                  type: groupData.group.type,
                  icon: categoryData.icon,
                  icon_color: getIconColor(categoryData.icon, 'category'),
                  description: '',
                  parent_id: groupId
                })
                createdCount++
              } else {
                skippedCount++
              }
            }
          }
        }

        $q.notify({
          type: 'positive',
          message: `Created ${createdCount} new categories! Skipped ${skippedCount} existing.`,
          position: 'top',
          timeout: 3000
        })

        await loadCategories()
      } catch (error) {
        console.error('Error seeding categories:', error)
        $q.notify({
          type: 'negative',
          message: `Failed to seed categories: ${error.message}`,
          position: 'top'
        })
      } finally {
        seeding.value = false
      }
    }

    onMounted(async () => {
      await loadCategories()
      await nextTick()
      initDragAndDrop()
    })

    const initDragAndDrop = () => {
      // Initialize drag and drop for groups (groups move with their categories)
      const tbody = document.querySelector('.budget-categories-table tbody')
      if (tbody) {
        new Sortable(tbody, {
          handle: '.drag-handle',
          animation: 200,
          draggable: 'tr.bg-grey-2',
          onStart: (evt) => {
            // When dragging starts, find all category rows for this group and mark them
            const groupId = evt.item.getAttribute('data-group-id')
            if (groupId) {
              const categoryRows = Array.from(tbody.querySelectorAll(`tr.category-row[data-group-id="${groupId}"]`))
              categoryRows.forEach(row => {
                row.setAttribute('data-dragging-with-group', 'true')
              })
            }
          },
          onEnd: async (evt) => {
            if (evt.oldIndex !== evt.newIndex && evt.item.classList.contains('bg-grey-2')) {
              const groupId = evt.item.getAttribute('data-group-id')
              if (groupId) {
                // Move all category rows to follow the group
                const categoryRows = Array.from(tbody.querySelectorAll(`tr.category-row[data-group-id="${groupId}"][data-dragging-with-group="true"]`))
                const groupRow = evt.item
                
                // Remove category rows from their current position
                categoryRows.forEach(row => {
                  row.remove()
                })
                
                // Insert category rows right after the group row
                let nextSibling = groupRow.nextElementSibling
                while (nextSibling && nextSibling.classList.contains('category-row') && nextSibling.getAttribute('data-group-id') === groupId) {
                  nextSibling = nextSibling.nextElementSibling
                }
                
                categoryRows.forEach((row, index) => {
                  if (nextSibling) {
                    tbody.insertBefore(row, nextSibling)
                  } else {
                    tbody.appendChild(row)
                  }
                  row.removeAttribute('data-dragging-with-group')
                })
              }
              await onTableDragEnd()
            }
          }
        })
      }

      // Initialize drag and drop for categories within each group
      const groupRows = document.querySelectorAll('tr[data-group-id]')
      groupRows.forEach((groupRow) => {
        const groupId = groupRow.getAttribute('data-group-id')
        const categoryRows = Array.from(groupRow.parentElement?.querySelectorAll(`tr.category-row[data-group-id="${groupId}"]`) || [])
        if (categoryRows.length > 1) {
          // Find the container that holds these category rows
          const container = categoryRows[0].parentElement
          if (container) {
            new Sortable(container, {
              handle: '.category-drag-handle',
              animation: 200,
              filter: (el) => {
                return !el.classList.contains('category-row') || !el.getAttribute('data-group-id') || el.getAttribute('data-group-id') !== groupId
              },
              draggable: `tr.category-row[data-group-id="${groupId}"]`,
              onEnd: async (evt) => {
                if (evt.oldIndex !== evt.newIndex) {
                  await onCategoryDragEnd(groupId.replace('group-', ''))
                }
              }
            })
          }
        }
      })
    }

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
      expenseGroups,
      incomeGroups,
      getCategoriesForGroup,
      toggleGroup,
      getIconColor,
      seeding,
      seedCategories,
      onGroupDragEnd,
      onCategoryDragEnd,
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


