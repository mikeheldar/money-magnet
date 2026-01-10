# Money Magnet (formerly Forcash) - Project Context

## Project Overview

Money Magnet is a comprehensive personal finance management application built with Vue 3 (Quasar Framework) frontend, Firebase backend, and N8N workflow automation. The application helps users track transactions, manage budgets, monitor accounts, and automate transaction categorization using AI.

## Architecture

### Frontend
- **Framework**: Quasar Framework (Vue 3 with Composition API)
- **Build Tool**: Quasar CLI
- **Deployment**: Vercel
- **State Management**: Vue 3 Composition API (`ref`, `computed`, `reactive`)
- **Routing**: Vue Router

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication (Email/Password)
- **Functions**: Firebase Cloud Functions (v2)
- **Storage**: Firebase Firestore
- **External Services**: 
  - Plaid API (bank account integration)
  - N8N Cloud (workflow automation for transaction categorization)

### Workflow Automation
- **Platform**: N8N Cloud
- **Purpose**: AI-powered transaction categorization
- **Webhook URL**: `https://money-magnet-cf5a4.app.n8n.cloud/webhook/categorize-transactions-batch`

## Tech Stack

### Frontend Dependencies
- `quasar` - UI framework
- `vue` - Core framework
- `vue-router` - Routing
- `firebase` - Firebase SDK for authentication and Firestore
- `@quasar/extras` - Icons and fonts

### Backend Dependencies
- `firebase-functions` - Cloud Functions
- `firebase-admin` - Admin SDK
- `plaid` - Plaid API client
- `axios` - HTTP client

## Key Features

### 1. Transaction Management
- **Location**: `frontend/src/pages/Transactions.vue`
- Add, edit, delete transactions
- Filter by date range, account, category
- Support for recurring transactions (Weekly/Monthly/Yearly)
- Manual and automatic categorization
- Display category icons

### 2. Account Management
- **Location**: `frontend/src/pages/Accounts.vue`
- Create and manage multiple accounts
- Track account balances
- Balance snapshots (manual and automatic end-of-month)
- Compare current balance to historical snapshots
- Visual indicators for balance changes

### 3. Budget Management
- **Location**: `frontend/src/pages/Budget.vue`
- Set monthly budgets by category
- View budgets for any month (historical and future)
- Compare current month to same day last month
- Trend indicators (up/down arrows)
- Percentage change calculations
- Actual vs. budgeted amounts

### 4. Recurring Transactions
- **Location**: `frontend/src/pages/Recurring.vue`
- View all recurring transactions grouped by frequency
- Tabs for Weekly, Monthly, Yearly
- Edit/delete recurring transactions
- Navigate to Transactions page for editing

### 5. Forecast
- **Location**: `frontend/src/pages/Forecast.vue`
- Project future account balances
- Date picker for future date selection
- Account balance projections

### 6. Dashboard
- **Location**: `frontend/src/pages/Dashboard.vue`
- Overview of financial status
- Summary statistics

### 7. Admin Tools
- **Location**: `frontend/src/pages/Admin.vue`
- Clear & Relearn All Categories: Removes all category assignments and recategorizes using AI
- Batch Transaction Categorization: Send uncategorized transactions to N8N
- Preview uncategorized transactions
- Detailed console logging for debugging

## File Structure

```
forcash/
├── frontend/                    # Quasar Vue 3 application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── Accounts.vue
│   │   │   ├── Admin.vue
│   │   │   ├── Budget.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── Forecast.vue
│   │   │   ├── Login.vue
│   │   │   ├── Recurring.vue
│   │   │   ├── Transactions.vue
│   │   │   └── trading/        # Trading-related pages
│   │   ├── services/           # API services
│   │   │   ├── firebase-api.js # Main Firebase/Firestore API
│   │   │   ├── api.js          # Legacy API (if exists)
│   │   │   └── plaid-service.js
│   │   ├── config/
│   │   │   └── firebase.js     # Firebase configuration
│   │   ├── layouts/
│   │   │   └── MainLayout.vue  # Main layout with navigation
│   │   ├── router/
│   │   │   ├── index.js
│   │   │   └── routes.js       # Route definitions
│   │   └── utils/
│   │       └── category-icons.js
│   ├── quasar.config.js
│   └── package.json
├── functions/                   # Firebase Cloud Functions
│   ├── index.js                # All function definitions
│   └── package.json
├── n8n-workflows/              # N8N workflow definitions
│   ├── categorize-transactions-batch.json
│   ├── categorize-transaction.json
│   └── learn-category.json
├── firestore.indexes.json      # Firestore composite indexes
├── firestore.rules            # Firestore security rules
├── firebase.json              # Firebase configuration
├── vercel.json                # Vercel deployment config
└── README.md
```

## Firebase Collections

### Collections Structure
- `accounts` - User bank accounts
- `transactions` - Financial transactions
- `categories` - Transaction categories
- `account_types` - Account type definitions
- `account_type_categories` - Categories per account type
- `budgets` - Monthly budget entries
- `balance_snapshots` - Historical account balance snapshots

### Key Fields

#### Transactions
- `user_id` (string) - Owner user ID
- `account_id` (string) - Associated account
- `date` (Timestamp) - Transaction date
- `amount` (number) - Transaction amount
- `type` (string) - 'income' or 'expense'
- `merchant` (string) - Merchant name
- `description` (string) - Transaction description
- `category_id` (string) - Assigned category ID
- `category_name` (string) - Category name (denormalized)
- `recurring` (boolean) - Is recurring transaction
- `recurring_frequency` (string) - 'weekly', 'monthly', or 'yearly'
- `external_id` (string) - External system ID (e.g., Plaid)

#### Balance Snapshots
- `user_id` (string) - Owner user ID
- `account_id` (string) - Associated account (null for all accounts)
- `date` (Timestamp) - Snapshot date
- `balance` (number) - Account balance at snapshot time
- `created_at` (Timestamp) - When snapshot was created

#### Budgets
- `user_id` (string) - Owner user ID
- `month` (number) - Month (1-12)
- `year` (number) - Year
- `category_id` (string) - Budget category
- `amount` (number) - Budgeted amount
- `created_at` (Timestamp) - When budget was created

## Firebase Functions

### Callable Functions (v2)
All functions use Firebase Functions v2 with `onCall`:

1. **`createBalanceSnapshot`**
   - Creates a manual balance snapshot for an account
   - Parameters: `account_id`, `balance`, `date`

2. **`getBalanceSnapshots`**
   - Retrieves balance snapshots for an account or all accounts
   - Parameters: `account_id` (optional)
   - Returns: Array of snapshots ordered by date (descending)

3. **`createEndOfMonthSnapshots`**
   - Creates snapshots for all accounts at end of month
   - Can be called manually or scheduled

4. **`categorizeTransactionsBatch`**
   - Sends transactions to N8N for categorization
   - Parameters: Array of transactions
   - Returns: Categorized results from N8N

### Scheduled Functions
- **`createEndOfMonthSnapshotsScheduled`**
  - Runs automatically at end of each month
  - Creates snapshots for all user accounts

### Function Configuration
```javascript
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  secrets: ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'N8N_WEBHOOK_URL']
});
```

## N8N Integration

### Workflow: `categorize-transactions-batch.json`
**Purpose**: Batch categorize transactions using AI and learned patterns

**Flow**:
1. Receives webhook with array of transactions
2. Splits into individual items
3. Checks learned category mappings
4. Uses AI categorization for unmatched transactions
5. Merges results from both paths
6. Aggregates all results into single array
7. Prepares response with all categorized transactions
8. Returns JSON response to webhook caller

**Key Nodes**:
- **Webhook Trigger**: Receives POST request
- **Split in Batches**: Splits transaction array into individual items
- **Check Learned Categories**: Looks up learned mappings
- **AI Categorization**: Uses AI for uncategorized transactions
- **Merge Results**: Combines learned and AI results
- **Aggregate Results**: Code node that collects all items
- **Prepare Response**: Code node that formats output
- **Respond to Webhook**: Returns formatted JSON

**Response Format**:
```json
{
  "success": true,
  "count": 86,
  "results": [
    {
      "transaction_id": "...",
      "description": "...",
      "merchant": "...",
      "category_id": "...",
      "category_name": "...",
      "confidence": 0.9,
      "source": "ai" | "learned"
    }
  ]
}
```

**Important Notes**:
- N8N may split large executions into multiple runs
- The workflow aggregates all results from the current execution run
- Frontend sends all transactions in one batch (BATCH_SIZE = 1000)
- The workflow handles merging results from different execution paths

## Frontend Service Layer

### `firebase-api.js`
Main API service for all Firebase/Firestore operations.

**Key Methods**:

#### Authentication
- `login(email, password)` - Sign in user
- `logout()` - Sign out user
- `getCurrentUser()` - Get current authenticated user

#### Transactions
- `getTransactions(filters)` - Get transactions with filters
- `createTransaction(transaction)` - Create new transaction
- `updateTransaction(id, updates)` - Update transaction
- `deleteTransaction(id)` - Delete transaction
- `categorizeTransactionsBatch(transactions)` - Send to N8N for categorization

#### Accounts
- `getAccounts()` - Get all user accounts
- `createAccount(account)` - Create new account
- `updateAccount(id, updates)` - Update account
- `deleteAccount(id)` - Delete account

#### Balance Snapshots
- `createBalanceSnapshot(account_id, balance, date)` - Create snapshot
- `getBalanceSnapshots(account_id)` - Get snapshots (all if account_id is null)
- `createEndOfMonthSnapshots()` - Trigger end-of-month snapshots

#### Budgets
- `getBudgets(month, year)` - Get budgets for month/year
- `createBudget(budget)` - Create budget entry
- `updateBudget(id, updates)` - Update budget
- `deleteBudget(id)` - Delete budget

#### Categories
- `getCategories()` - Get all categories
- `createCategory(category)` - Create category
- `updateCategory(id, updates)` - Update category

**Error Handling**:
- `handleFirestoreError()` - Extracts and logs Firestore index creation links
- Comprehensive error logging with context
- User-friendly error messages

## Deployment

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist/spa",
  "installCommand": "cd frontend && npm install",
  "rewrites": [
    {
      "source": "/((?!assets|.*\\.(js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|json)).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{"key": "Content-Type", "value": "application/javascript"}]
    },
    {
      "source": "/assets/(.*\\.css)",
      "headers": [{"key": "Content-Type", "value": "text/css"}]
    }
  ]
}
```

**Key Points**:
- Rewrites exclude asset files to prevent MIME type errors
- Headers ensure correct Content-Type for JS/CSS assets
- Build runs in `frontend` directory
- Output is `frontend/dist/spa`

### Firebase Functions Deployment
```bash
firebase deploy --only functions
```

### Firestore Indexes Deployment
```bash
firebase deploy --only firestore:indexes
```

## Firestore Indexes

All composite indexes are defined in `firestore.indexes.json`:

1. **accounts**: `user_id` + `created_at` (desc)
2. **transactions**: 
   - `user_id` + `date` (asc/desc)
   - `user_id` + `account_id` + `date` (desc)
   - `user_id` + `external_id`
3. **balance_snapshots**:
   - `user_id` + `date` (desc)
   - `user_id` + `account_id` + `date` (desc)
4. **categories**: `user_id` + `name`
5. **account_types**: `user_id` + `name`
6. **account_type_categories**: `user_id` + `name`

**Important**: If you see a Firestore index error, click the link in the console to create the index, or deploy indexes manually.

## Recent Issues & Fixes

### 1. N8N Batch Categorization - Split Results
**Problem**: N8N was processing 86 transactions but only returning 6 results. The workflow was splitting execution into multiple runs.

**Solution**:
- Updated N8N workflow to use "Aggregate Results" Code node that collects all items
- Added "Prepare Response" Code node that formats all results
- Increased frontend `BATCH_SIZE` from 50 to 1000 to send all transactions in one batch
- N8N workflow now aggregates all results from current execution run

**Files Changed**:
- `n8n-workflows/categorize-transactions-batch.json`
- `frontend/src/pages/Admin.vue` (BATCH_SIZE = 1000)
- `frontend/src/services/firebase-api.js` (added detailed logging)

### 2. Clear & Relearn Starting Before Confirmation
**Problem**: The "Clear Categories & Relearn All" process was starting before user clicked "Yes, Clear & Relearn" on the confirmation dialog.

**Solution**:
- Restructured `clearAndRelearnAll()` function to await dialog confirmation
- Added early return if user cancels
- Only set `clearingAndRelearning.value = true` after confirmation
- Added logging to track dialog flow

**Files Changed**:
- `frontend/src/pages/Admin.vue`

### 3. Vercel Serving HTML for JS Assets (MIME Type Error)
**Problem**: Vercel was serving `index.html` for JS/CSS assets, causing MIME type errors.

**Solution**:
- Updated `vercel.json` rewrites to exclude asset files
- Added headers to ensure correct Content-Type for JS/CSS
- Pattern: `/((?!assets|.*\\.(js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|json)).*)`

**Files Changed**:
- `vercel.json`

### 4. Balance Snapshots - CORS and 500 Errors
**Problem**: CORS error and 500 Internal Server Error when adding/comparing balance snapshots.

**Solution**:
- Added Firestore composite indexes for `balance_snapshots` collection
- Removed redundant `cors` option from Firebase Functions v2 (handled automatically)
- Improved error handling in `Accounts.vue` to show user-friendly messages
- Added try-catch for index warnings in `getBalanceSnapshots` function

**Files Changed**:
- `firestore.indexes.json` (added balance_snapshots indexes)
- `functions/index.js` (removed cors, added error handling)
- `frontend/src/pages/Accounts.vue` (improved error handling)

### 5. Budget Page - Failed to Load Budgets
**Problem**: Budget page showing "Failed to load budgets" error.

**Solution**:
- Added comprehensive error logging to `loadBudgets` function
- Added `orderBy('created_at', 'desc')` to `getBudgets` query
- Added in-memory sorting fallback

**Files Changed**:
- `frontend/src/pages/Budget.vue`
- `frontend/src/services/firebase-api.js`

### 6. Invalid Categories on Transactions Page
**Problem**: Transactions showing "Invalid Category" even after N8N returned valid categories.

**Solution**:
- Added detailed logging to `categorizeTransactionsBatch` in `firebase-api.js`
- Ensured `category_name` is always included in N8N response
- Added validation in frontend to check both `category_id` and `category_name`
- Fixed N8N workflow to always include `category_name` in response

**Files Changed**:
- `frontend/src/services/firebase-api.js` (added logging)
- `n8n-workflows/categorize-transactions-batch.json` (ensured category_name in response)

## Important Code Patterns

### Confirmation Dialogs
```javascript
const confirmed = await $q.dialog({
  title: 'Confirm Action',
  message: 'Are you sure?',
  cancel: true,
  persistent: true
})

if (!confirmed) {
  return // User cancelled
}

// Proceed with action
```

### Batch Processing
```javascript
const BATCH_SIZE = 1000
const batches = []
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  batches.push(items.slice(i, i + BATCH_SIZE))
}
```

### Firestore Queries with Error Handling
```javascript
try {
  const q = query(
    collection(db, 'collection'),
    where('user_id', '==', userId),
    orderBy('date', 'desc')
  )
  const snapshot = await getDocs(q)
  // Process results
} catch (error) {
  handleFirestoreError(error, 'context')
  throw error
}
```

### Firebase Functions v2 Callable
```javascript
exports.functionName = onCall(async (request) => {
  const { data } = request
  const userId = request.auth.uid
  
  // Function logic
  
  return { success: true, data: result }
})
```

## Environment Variables & Secrets

### Firebase Functions Secrets
Set using Firebase CLI:
```bash
firebase functions:secrets:set PLAID_CLIENT_ID
firebase functions:secrets:set PLAID_SECRET
firebase functions:secrets:set N8N_WEBHOOK_URL
```

### Frontend Environment
Firebase config is in `frontend/src/config/firebase.js`:
- Uses Firebase project configuration
- No API keys exposed (uses Firebase SDK)

## Debugging Tips

### Console Logging
- Frontend uses emoji prefixes for easy filtering:
  - 🟢 Success/Info
  - ❌ Error
  - 🔵 Info
  - 📊 Data/Stats
- Admin page has extensive logging for categorization process

### Firestore Index Errors
- Check console for index creation links
- Click link to create index in Firebase Console
- Or deploy indexes: `firebase deploy --only firestore:indexes`

### N8N Workflow Debugging
- Check N8N execution logs in N8N Cloud dashboard
- Frontend logs N8N request/response in console
- Check `DEBUG_N8N.md` and other N8N docs in project root

### Vercel Deployment Issues
- Check Vercel dashboard for build logs
- Ensure `vercel.json` is correct
- Clear browser cache after deployment
- Check that latest commit is deployed

## Known Issues & Workarounds

### 1. N8N Execution Splitting
**Issue**: N8N may split large executions into multiple runs, each returning separate responses.

**Workaround**: 
- Frontend sends all transactions in one batch (BATCH_SIZE = 1000)
- N8N workflow aggregates all results from current execution run
- If split occurs, frontend processes each response separately

### 2. Browser Cache After Deployment
**Issue**: Browser may serve cached JavaScript after Vercel deployment.

**Workaround**:
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Use incognito/private window
- Check Vercel deployment status before testing

### 3. Firestore Index Building Time
**Issue**: New composite indexes take time to build (can be several minutes).

**Workaround**:
- Check Firebase Console for index status
- Show user-friendly message: "Indexes are building, please wait"
- Retry query after a few minutes

## Future Enhancements

### Potential Features
- Plaid integration for automatic transaction import
- Recurring transaction automation (create future transactions)
- Budget alerts/notifications
- Export transactions to CSV
- Multi-currency support
- Investment tracking
- Tax reporting

### Technical Improvements
- Add unit tests
- Add E2E tests
- Implement proper error boundaries
- Add loading skeletons
- Optimize Firestore queries with pagination
- Add offline support with service workers

## Quick Reference Commands

### Development
```bash
# Start frontend dev server
cd frontend && quasar dev

# Deploy Firebase functions
firebase deploy --only functions

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy everything
firebase deploy
```

### Git Workflow
```bash
# Commit and push (triggers Vercel deployment)
git add -A
git commit -m "Description"
git push
```

### Firebase CLI
```bash
# Login
firebase login

# Set secrets
firebase functions:secrets:set SECRET_NAME

# View logs
firebase functions:log

# View Firestore data
firebase firestore:indexes
```

## Contact & Support

For issues or questions:
1. Check console logs (browser and Firebase Functions)
2. Review N8N execution logs
3. Check Vercel deployment status
4. Verify Firestore indexes are built
5. Check Firebase Functions logs: `firebase functions:log`

---

**Last Updated**: 2025-01-XX
**Project Name**: Money Magnet (formerly Forcash)
**Repository**: https://github.com/mikeheldar/money-magnet

