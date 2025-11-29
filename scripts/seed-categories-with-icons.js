// Script to seed category groups and categories with icons
// Run this in the browser console on the Budget Categories page

import { categoryIcons, categoryGroupIcons } from '../frontend/src/utils/category-icons.js'

// Category groups with their categories and suggested icons
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

// Function to get icon color
function getIconColor(iconName, type = 'category') {
  const allIcons = type === 'category' ? categoryIcons : categoryGroupIcons
  const icon = allIcons.find(i => i.name === iconName)
  return icon ? icon.color : '#757575'
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.seedCategoriesWithIcons = async function() {
    const { db, auth } = await import('../frontend/src/config/firebase.js')
    const { collection, addDoc, query, where, getDocs } = await import('firebase/firestore')
    
    const userId = auth.currentUser?.uid
    if (!userId) {
      console.error('Not authenticated')
      return
    }

    console.log('🌱 Starting to seed categories with icons...')

    // Check existing categories
    const categoriesRef = collection(db, 'categories')
    const existingQuery = query(categoriesRef, where('user_id', '==', userId))
    const existingSnapshot = await getDocs(existingQuery)
    const existingCategories = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    console.log(`Found ${existingCategories.length} existing categories`)

    let createdCount = 0
    let skippedCount = 0

    // Create category groups and categories
    for (const type of ['expense', 'income']) {
      for (const groupData of categoryStructure[type]) {
        // Check if group already exists
        const existingGroup = existingCategories.find(
          c => c.name === groupData.group.name && !c.parent_id && c.type === type
        )

        let groupId
        if (existingGroup) {
          console.log(`⏭️  Group "${groupData.group.name}" already exists, skipping...`)
          groupId = existingGroup.id
          skippedCount++
        } else {
          // Create group
          const groupDoc = await addDoc(categoriesRef, {
            user_id: userId,
            name: groupData.group.name,
            type: groupData.group.type,
            icon: groupData.group.icon,
            icon_color: getIconColor(groupData.group.icon, 'group'),
            description: '',
            parent_id: null
          })
          groupId = groupDoc.id
          console.log(`✅ Created group: ${groupData.group.name}`)
          createdCount++
        }

        // Create categories for this group
        for (const categoryData of groupData.categories) {
          const existingCategory = existingCategories.find(
            c => c.name === categoryData.name && c.parent_id === groupId
          )

          if (existingCategory) {
            console.log(`⏭️  Category "${categoryData.name}" already exists, skipping...`)
            skippedCount++
          } else {
            await addDoc(categoriesRef, {
              user_id: userId,
              name: categoryData.name,
              type: groupData.group.type,
              icon: categoryData.icon,
              icon_color: getIconColor(categoryData.icon, 'category'),
              description: '',
              parent_id: groupId
            })
            console.log(`✅ Created category: ${categoryData.name}`)
            createdCount++
          }
        }
      }
    }

    console.log(`\n🎉 Done! Created ${createdCount} new items, skipped ${skippedCount} existing items`)
    console.log('Refresh the page to see the new categories!')
  }
}

export { categoryStructure, getIconColor }


