// Script to seed Firestore with initial data
// Run with: node scripts/seed-firestore.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedFirestore() {
  try {
    console.log('Starting Firestore seed...');

    // Create a test user (you'll need to create this user in Firebase Auth first)
    // For now, we'll use a placeholder user ID
    const userId = 'test-user-id'; // Replace with actual Firebase Auth user ID

    // Create account type categories
    const debtCategoryRef = await db.collection('account_type_categories').add({
      user_id: userId,
      name: 'Debt',
      description: 'Debt accounts including credit cards and loans',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const assetCategoryRef = await db.collection('account_type_categories').add({
      user_id: userId,
      name: 'Assets',
      description: 'Asset accounts including bank accounts and investments',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

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
    ];

    const accountTypeRefs = {};
    for (const type of accountTypes) {
      const ref = await db.collection('account_types').add({
        user_id: userId,
        ...type,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      accountTypeRefs[type.code] = ref.id;
    }

    // Create sample accounts
    const accounts = [
      { name: 'Checking Account', type: 'checking', account_type_id: accountTypeRefs.checking, balance_current: 5000.00, balance_available: 5000.00 },
      { name: 'Savings Account', type: 'savings', account_type_id: accountTypeRefs.savings, balance_current: 10000.00, balance_available: 10000.00 },
      { name: 'Chase Freedom Visa', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -20000.00, balance_available: 55000.00, interest_rate: 17.99, credit_limit: 75000.00 },
      { name: 'Chase Amazon Prime Visa', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -1000.00, balance_available: 37500.00, credit_limit: 38500.00 },
      { name: 'American Express Blue Cash Preferred', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -2000.00, balance_available: 13000.00, credit_limit: 15000.00 },
      { name: 'American Express EveryDay', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 3000.00, interest_rate: 15.24, credit_limit: 3000.00 },
      { name: 'American Express SkyMiles Gold', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 45000.00, credit_limit: 45000.00 },
      { name: 'Meryl Lynch card', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: -7000.00, balance_available: 30000.00, interest_rate: 12.99, credit_limit: 37000.00 },
      { name: 'Bank of America - Bankamerica Rewards', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 4500.00, interest_rate: 7.24, credit_limit: 4500.00 },
      { name: 'Barclays Aviator Mastercard', type: 'credit_card', account_type_id: accountTypeRefs.credit_card, balance_current: 0.00, balance_available: 7000.00, credit_limit: 7000.00 }
    ];

    for (const account of accounts) {
      await db.collection('accounts').add({
        user_id: userId,
        ...account,
        currency: 'USD',
        is_closed: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create transaction categories with proper grouping
    // Income category groups
    const incomeGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Income',
      type: 'income',
      parent_id: null,
      description: 'All income sources',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Income categories (children of Income group)
    const incomeCategories = [
      { name: 'Salary', type: 'income', parent_id: incomeGroupRef.id },
      { name: 'Bonus', type: 'income', parent_id: incomeGroupRef.id },
      { name: 'Rental Income', type: 'income', parent_id: incomeGroupRef.id },
      { name: 'Investment Income', type: 'income', parent_id: incomeGroupRef.id },
      { name: 'Other Income', type: 'income', parent_id: incomeGroupRef.id }
    ];

    // Expense category groups
    const homeGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Home',
      type: 'expense',
      parent_id: null,
      description: 'Housing and home-related expenses',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const foodGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Food',
      type: 'expense',
      parent_id: null,
      description: 'Food and dining expenses',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const transportGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Transport',
      type: 'expense',
      parent_id: null,
      description: 'Transportation expenses',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const entertainmentGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Entertainment',
      type: 'expense',
      parent_id: null,
      description: 'Entertainment and recreation',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const subscriptionsGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Subscriptions',
      type: 'expense',
      parent_id: null,
      description: 'Monthly subscriptions and services',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const insuranceGroupRef = await db.collection('categories').add({
      user_id: userId,
      name: 'Insurance',
      type: 'expense',
      parent_id: null,
      description: 'Insurance payments',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Expense categories (children of groups)
    const expenseCategories = [
      // Home group children
      { name: 'Rent', type: 'expense', parent_id: homeGroupRef.id },
      { name: 'Utilities', type: 'expense', parent_id: homeGroupRef.id },
      { name: 'Maintenance', type: 'expense', parent_id: homeGroupRef.id },
      { name: 'Home Insurance', type: 'expense', parent_id: homeGroupRef.id },
      
      // Food group children
      { name: 'Groceries', type: 'expense', parent_id: foodGroupRef.id },
      { name: 'Restaurants', type: 'expense', parent_id: foodGroupRef.id },
      { name: 'Coffee & Snacks', type: 'expense', parent_id: foodGroupRef.id },
      
      // Transport group children
      { name: 'Fuel', type: 'expense', parent_id: transportGroupRef.id },
      { name: 'Uber/Lyft', type: 'expense', parent_id: transportGroupRef.id },
      { name: 'Public Transit', type: 'expense', parent_id: transportGroupRef.id },
      { name: 'Car Maintenance', type: 'expense', parent_id: transportGroupRef.id },
      
      // Entertainment group children
      { name: 'Movies', type: 'expense', parent_id: entertainmentGroupRef.id },
      { name: 'Concerts', type: 'expense', parent_id: entertainmentGroupRef.id },
      { name: 'Hobbies', type: 'expense', parent_id: entertainmentGroupRef.id },
      
      // Subscriptions group children
      { name: 'Streaming Services', type: 'expense', parent_id: subscriptionsGroupRef.id },
      { name: 'Software Subscriptions', type: 'expense', parent_id: subscriptionsGroupRef.id },
      { name: 'Gym Membership', type: 'expense', parent_id: subscriptionsGroupRef.id },
      
      // Insurance group children
      { name: 'Health Insurance', type: 'expense', parent_id: insuranceGroupRef.id },
      { name: 'Auto Insurance', type: 'expense', parent_id: insuranceGroupRef.id },
      { name: 'Life Insurance', type: 'expense', parent_id: insuranceGroupRef.id }
    ];

    // Create all income categories
    for (const category of incomeCategories) {
      await db.collection('categories').add({
        user_id: userId,
        ...category,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create all expense categories
    for (const category of expenseCategories) {
      await db.collection('categories').add({
        user_id: userId,
        ...category,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log('Firestore seed completed successfully!');
    console.log('Note: You need to create a user in Firebase Auth and update the userId in this script');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Firestore:', error);
    process.exit(1);
  }
}

seedFirestore();


