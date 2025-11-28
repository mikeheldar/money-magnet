<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">Seed Firestore Data</div>
            <div class="text-subtitle2 q-mt-sm text-grey-7">
              This will populate your Firestore database with initial data including accounts, categories, and account types.
            </div>
          </q-card-section>

          <q-card-section>
            <q-btn
              color="primary"
              label="Seed Database"
              :loading="seeding"
              @click="seedData"
              :disable="seeding"
            />
          </q-card-section>

          <q-card-section v-if="message">
            <q-banner
              :class="messageType === 'success' ? 'bg-positive text-white' : 'bg-negative text-white'"
              rounded
            >
              {{ message }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'

export default defineComponent({
  name: 'SeedDataPage',
  setup() {
    const $q = useQuasar()
    const seeding = ref(false)
    const message = ref('')
    const messageType = ref('')

    const seedData = async () => {
      seeding.value = true
      message.value = ''
      
      try {
        const user = auth.currentUser
        if (!user) {
          throw new Error('You must be logged in to seed Firestore')
        }

        const userId = user.uid
        console.log('Seeding Firestore for user:', userId)

        // Check if data already exists
        const accountsSnapshot = await getDocs(query(collection(db, 'accounts'), where('user_id', '==', userId)))
        if (!accountsSnapshot.empty) {
          message.value = 'Data already exists. Skipping seed.'
          messageType.value = 'info'
          seeding.value = false
          return
        }

        // Create account type categories
        const debtCategoryRef = await addDoc(collection(db, 'account_type_categories'), {
          user_id: userId,
          name: 'Debt',
          description: 'Debt accounts including credit cards and loans',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })

        const assetCategoryRef = await addDoc(collection(db, 'account_type_categories'), {
          user_id: userId,
          name: 'Assets',
          description: 'Asset accounts including bank accounts and investments',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })

        // Create account types
        const accountTypes = [
          { name: 'Credit Card', code: 'credit_card', category_id: debtCategoryRef.id, description: 'Credit card accounts' },
          { name: 'Loan', code: 'loan', category_id: debtCategoryRef.id, description: 'Loan accounts' },
          { name: 'Mortgage', code: 'mortgage', category_id: debtCategoryRef.id, description: 'Mortgage accounts' },
          { name: 'Checking', code: 'checking', category_id: assetCategoryRef.id, description: 'Checking accounts' },
          { name: 'Savings', code: 'savings', category_id: assetCategoryRef.id, description: 'Savings accounts' },
          { name: 'Investment', code: 'investment', category_id: assetCategoryRef.id, description: 'Investment accounts' },
          { name: 'Cash', code: 'cash', category_id: assetCategoryRef.id, description: 'Cash accounts' },
          { name: 'Other', code: 'other', category_id: null, description: 'Other account types' }
        ]

        const accountTypeRefs = {}
        for (const type of accountTypes) {
          const ref = await addDoc(collection(db, 'account_types'), {
            user_id: userId,
            ...type,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          })
          accountTypeRefs[type.code] = ref.id
        }

        // Create accounts
        const accounts = [
          { name: 'Checking Account', type: 'checking', account_type_id: accountTypeRefs.checking, balance_current: 5000.00, balance_available: 5000.00, currency: 'USD', is_closed: false },
          { name: 'Savings Account', type: 'savings', account_type_id: accountTypeRefs.savings, balance_current: 10000.00, balance_available: 10000.00, currency: 'USD', is_closed: false },
          { name: 'Chase Freedom Visa', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -20000.00, balance_available: 55000.00, interest_rate: 17.99, credit_limit: 75000.00, currency: 'USD', is_closed: false },
          { name: 'Chase Amazon Prime Visa', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -1000.00, balance_available: 37500.00, credit_limit: 38500.00, currency: 'USD', is_closed: false },
          { name: 'American Express Blue Cash Preferred', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -2000.00, balance_available: 13000.00, credit_limit: 15000.00, currency: 'USD', is_closed: false },
          { name: 'American Express EveryDay', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 3000.00, interest_rate: 15.24, credit_limit: 3000.00, currency: 'USD', is_closed: false },
          { name: 'American Express SkyMiles Gold', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 45000.00, credit_limit: 45000.00, currency: 'USD', is_closed: false },
          { name: 'Meryl Lynch card', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -7000.00, balance_available: 30000.00, interest_rate: 12.99, credit_limit: 37000.00, currency: 'USD', is_closed: false },
          { name: 'Bank of America - Bankamerica Rewards', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 4500.00, interest_rate: 7.24, credit_limit: 4500.00, currency: 'USD', is_closed: false },
          { name: 'Barclays Aviator Mastercard', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 7000.00, credit_limit: 7000.00, currency: 'USD', is_closed: false }
        ]

        for (const account of accounts) {
          await addDoc(collection(db, 'accounts'), {
            user_id: userId,
            ...account,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          })
        }

        // Create transaction categories
        const categories = [
          { name: 'Salary', type: 'income', parent_id: null },
          { name: 'Bonus', type: 'income', parent_id: null },
          { name: 'Rental Income', type: 'income', parent_id: null },
          { name: 'Home', type: 'expense', parent_id: null },
          { name: 'Rent', type: 'expense', parent_id: null },
          { name: 'Utilities', type: 'expense', parent_id: null },
          { name: 'Maintenance', type: 'expense', parent_id: null },
          { name: 'Food', type: 'expense', parent_id: null },
          { name: 'Groceries', type: 'expense', parent_id: null },
          { name: 'Restaurants', type: 'expense', parent_id: null },
          { name: 'Transport', type: 'expense', parent_id: null },
          { name: 'Fuel', type: 'expense', parent_id: null },
          { name: 'Uber/Lyft', type: 'expense', parent_id: null },
          { name: 'Subscriptions', type: 'expense', parent_id: null },
          { name: 'Insurance', type: 'expense', parent_id: null },
          { name: 'Credit Card Payment', type: 'debt', parent_id: null },
          { name: 'Loan Payment', type: 'debt', parent_id: null },
          { name: 'Interest Charges', type: 'debt', parent_id: null },
          { name: 'Late Fees', type: 'debt', parent_id: null }
        ]

        const categoryRefs = {}
        for (const category of categories) {
          const ref = await addDoc(collection(db, 'categories'), {
            user_id: userId,
            ...category,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          })
          categoryRefs[category.name] = ref.id
        }

        // Update parent categories
        await updateDoc(doc(db, 'categories', categoryRefs['Rent']), { parent_id: categoryRefs['Home'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Utilities']), { parent_id: categoryRefs['Home'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Maintenance']), { parent_id: categoryRefs['Home'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Groceries']), { parent_id: categoryRefs['Food'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Restaurants']), { parent_id: categoryRefs['Food'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Fuel']), { parent_id: categoryRefs['Transport'] })
        await updateDoc(doc(db, 'categories', categoryRefs['Uber/Lyft']), { parent_id: categoryRefs['Transport'] })

        message.value = 'Database seeded successfully! You can now view your accounts and data.'
        messageType.value = 'success'
        
        $q.notify({
          type: 'positive',
          message: 'Database seeded successfully!',
          position: 'top'
        })
      } catch (error) {
        console.error('Error seeding Firestore:', error)
        message.value = `Error: ${error.message}`
        messageType.value = 'error'
        
        $q.notify({
          type: 'negative',
          message: `Failed to seed database: ${error.message}`,
          position: 'top'
        })
      } finally {
        seeding.value = false
      }
    }

    return {
      seeding,
      message,
      messageType,
      seedData
    }
  }
})
</script>



