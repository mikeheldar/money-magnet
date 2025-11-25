const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

// Remove existing database if it exists (for development)
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create comprehensive schema
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Institutions table (optional)
  CREATE TABLE IF NOT EXISTS institutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Account Type Categories table
  CREATE TABLE IF NOT EXISTS account_type_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Account Types table
  CREATE TABLE IF NOT EXISTS account_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES account_type_categories(id)
  );

  -- Accounts table (enhanced)
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    institution_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    account_type_id INTEGER,
    currency TEXT DEFAULT 'USD',
    balance_current DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_available DECIMAL(12,2),
    interest_rate DECIMAL(5,2),
    credit_limit DECIMAL(12,2),
    is_closed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (account_type_id) REFERENCES account_types(id)
  );

  -- Categories table (hierarchical)
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'debt')),
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
  );

  -- Transactions table (enhanced)
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    merchant TEXT,
    date DATE NOT NULL,
    posted_at DATETIME,
    external_id TEXT,
    transfer_group_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  -- Budgets table
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    period TEXT NOT NULL CHECK(period IN ('monthly', 'weekly', 'yearly')),
    amount DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  -- Goals table
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    target_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Net Worth Snapshots table
  CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    assets_total DECIMAL(12,2) NOT NULL,
    liabilities_total DECIMAL(12,2) NOT NULL,
    net_worth DECIMAL(12,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed initial user (mike/password)
const insertUser = db.prepare('INSERT INTO users (username, password, name, email) VALUES (?, ?, ?, ?)');
const userResult = insertUser.run('mike', 'password', 'Mike', 'mike@example.com');
const userId = userResult.lastInsertRowid;

// Seed default transaction categories
const insertTransactionCategory = db.prepare(`
  INSERT INTO categories (user_id, name, type, parent_id)
  VALUES (?, ?, ?, ?)
`);

// Income categories
const salaryCat = insertTransactionCategory.run(userId, 'Salary', 'income', null).lastInsertRowid;
insertTransactionCategory.run(userId, 'Bonus', 'income', null);
insertTransactionCategory.run(userId, 'Rental Income', 'income', null);

// Expense categories
const homeCat = insertTransactionCategory.run(userId, 'Home', 'expense', null).lastInsertRowid;
insertTransactionCategory.run(userId, 'Rent', 'expense', homeCat);
insertTransactionCategory.run(userId, 'Utilities', 'expense', homeCat);
insertTransactionCategory.run(userId, 'Maintenance', 'expense', homeCat);

const foodCat = insertTransactionCategory.run(userId, 'Food', 'expense', null).lastInsertRowid;
insertTransactionCategory.run(userId, 'Groceries', 'expense', foodCat);
insertTransactionCategory.run(userId, 'Restaurants', 'expense', foodCat);

const transportCat = insertTransactionCategory.run(userId, 'Transport', 'expense', null).lastInsertRowid;
insertTransactionCategory.run(userId, 'Fuel', 'expense', transportCat);
insertTransactionCategory.run(userId, 'Uber/Lyft', 'expense', transportCat);

insertTransactionCategory.run(userId, 'Subscriptions', 'expense', null);
insertTransactionCategory.run(userId, 'Insurance', 'expense', null);

// Debt categories
insertTransactionCategory.run(userId, 'Credit Card Payment', 'debt', null);
insertTransactionCategory.run(userId, 'Loan Payment', 'debt', null);
insertTransactionCategory.run(userId, 'Interest Charges', 'debt', null);
insertTransactionCategory.run(userId, 'Late Fees', 'debt', null);

// Seed account type categories
const insertCategory = db.prepare(`
  INSERT INTO account_type_categories (user_id, name, description)
  VALUES (?, ?, ?)
`);

const debtCategoryId = insertCategory.run(userId, 'Debt', 'Debt accounts including credit cards and loans').lastInsertRowid;
const assetCategoryId = insertCategory.run(userId, 'Assets', 'Asset accounts including bank accounts and investments').lastInsertRowid;

// Seed account types
const insertAccountType = db.prepare(`
  INSERT INTO account_types (user_id, category_id, name, code, description)
  VALUES (?, ?, ?, ?, ?)
`);

// Debt account types
const creditCardTypeId = insertAccountType.run(userId, debtCategoryId, 'Credit Card', 'credit_card', 'Credit card accounts').lastInsertRowid;
const loanTypeId = insertAccountType.run(userId, debtCategoryId, 'Loan', 'loan', 'Loan accounts').lastInsertRowid;
const mortgageTypeId = insertAccountType.run(userId, debtCategoryId, 'Mortgage', 'mortgage', 'Mortgage accounts').lastInsertRowid;

// Asset account types
const checkingTypeId = insertAccountType.run(userId, assetCategoryId, 'Checking', 'checking', 'Checking accounts').lastInsertRowid;
const savingsTypeId = insertAccountType.run(userId, assetCategoryId, 'Savings', 'savings', 'Savings accounts').lastInsertRowid;
const investmentTypeId = insertAccountType.run(userId, assetCategoryId, 'Investment', 'investment', 'Investment accounts').lastInsertRowid;
const cashTypeId = insertAccountType.run(userId, assetCategoryId, 'Cash', 'cash', 'Cash accounts').lastInsertRowid;
const otherTypeId = insertAccountType.run(userId, null, 'Other', 'other', 'Other account types').lastInsertRowid;

// Seed accounts
const insertAccount = db.prepare(`
  INSERT INTO accounts (user_id, name, type, account_type_id, balance_current, balance_available, interest_rate, credit_limit)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Bank accounts
insertAccount.run(userId, 'Checking Account', 'checking', checkingTypeId, 5000.00, 5000.00, null, null);
insertAccount.run(userId, 'Savings Account', 'savings', savingsTypeId, 10000.00, 10000.00, null, null);

// Credit cards from user's data (exact values from provided table)
insertAccount.run(userId, 'Chase Freedom Visa', 'credit_card', creditCardTypeId, -20000.00, 55000.00, 17.99, 75000.00);
insertAccount.run(userId, 'Chase Amazon Prime Visa', 'credit_card', creditCardTypeId, -1000.00, 37500.00, null, 38500.00);
insertAccount.run(userId, 'American Express Blue Cash Preferred', 'credit_card', creditCardTypeId, -2000.00, 13000.00, null, 15000.00);
insertAccount.run(userId, 'American Express EveryDay', 'credit_card', creditCardTypeId, 0.00, 3000.00, 15.24, 3000.00);
insertAccount.run(userId, 'American Express SkyMiles Gold', 'credit_card', creditCardTypeId, 0.00, 45000.00, null, 45000.00);
insertAccount.run(userId, 'Meryl Lynch card', 'credit_card', creditCardTypeId, -7000.00, 30000.00, 12.99, 37000.00);
insertAccount.run(userId, 'Bank of America - Bankamerica Rewards', 'credit_card', creditCardTypeId, 0.00, 4500.00, 7.24, 4500.00);
insertAccount.run(userId, 'Barclays Aviator Mastercard', 'credit_card', creditCardTypeId, 0.00, 7000.00, null, 7000.00);

// Seed some sample transactions
const insertTransaction = db.prepare(`
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const today = new Date();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
const thisMonth = new Date(today.getFullYear(), today.getMonth(), 5);

// Get transaction category IDs
const getTransactionCategoryId = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1');
const salaryCategoryId = getTransactionCategoryId.get(userId, 'Salary').id;
const rentCategoryId = getTransactionCategoryId.get(userId, 'Rent').id;
const groceriesCategoryId = getTransactionCategoryId.get(userId, 'Groceries').id;

// Get account IDs (checking account is first, ID should be 1)
const checkingAccountId = 1;

insertTransaction.run(userId, checkingAccountId, salaryCategoryId, 'income', 3000.00, 'Salary', lastMonth.toISOString().split('T')[0]);
insertTransaction.run(userId, checkingAccountId, rentCategoryId, 'expense', 500.00, 'Rent', lastMonth.toISOString().split('T')[0]);
insertTransaction.run(userId, checkingAccountId, groceriesCategoryId, 'expense', 200.00, 'Groceries', lastMonth.toISOString().split('T')[0]);
insertTransaction.run(userId, checkingAccountId, salaryCategoryId, 'income', 3000.00, 'Salary', thisMonth.toISOString().split('T')[0]);
insertTransaction.run(userId, checkingAccountId, rentCategoryId, 'expense', 500.00, 'Rent', thisMonth.toISOString().split('T')[0]);

console.log('Database initialized successfully!');
console.log('Created user: mike / password');
console.log('Created comprehensive schema with:');
console.log('  - Users, Accounts, Categories, Transactions, Budgets, Goals, Net Worth Snapshots');
console.log('  - 8 credit cards with interest rates and credit limits');
console.log('  - Default categories for income, expenses, and debt');
console.log('  - Sample transactions');

db.close();
