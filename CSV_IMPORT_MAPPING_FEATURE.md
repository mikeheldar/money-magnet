# CSV Import with Account & Category Mapping Feature

## Overview

This feature enhancement allows the CSV import on the Transactions page to automatically create accounts and categories from the CSV file, and provides a mapping interface to link CSV accounts/categories to existing ones.

## What's New

### 1. Enhanced CSV Import
- **Original Statement Field**: CSV's "Original Statement" field now properly maps to the transaction's `description` field
- **Auto-create Accounts**: Accounts from CSV that don't match existing accounts are automatically created with a `needs_mapping` flag
- **Auto-create Categories**: Categories from CSV that don't match existing categories are automatically created with a `needs_mapping` flag
- **Mapping Support**: Uses account and category mappings to automatically map future imports

### 2. New Firestore Collections

#### `account_mappings`
Stores mappings between CSV account names and existing accounts.

**Fields:**
- `user_id` (string) - Owner user ID
- `csv_name` (string) - The account name as it appears in CSV
- `target_account_id` (string) - The ID of the existing account to map to
- `created_at` (Timestamp) - When mapping was created

#### `category_mappings`
Stores mappings between CSV category names and existing categories.

**Fields:**
- `user_id` (string) - Owner user ID
- `csv_name` (string) - The category name as it appears in CSV
- `target_category_id` (string) - The ID of the existing category to map to
- `created_at` (Timestamp) - When mapping was created

### 3. Accounts Page Enhancements

**New Section: "New Accounts from CSV Import"**
- Displays all accounts imported from CSV that need mapping
- Shows account name and balance
- Two options for each unmapped account:
  1. **Map to Existing**: Opens a dialog to select an existing account to map to
  2. **Keep as New**: Keeps the account as a new, standalone account

**Mapping Dialog:**
- Shows CSV account name
- Dropdown to select existing account with type and balance info
- Saves the mapping for future imports
- Updates the account to remove `needs_mapping` flag

### 4. Budget Categories Page Enhancements

**New Section: "New Categories from CSV Import"**
- Displays all categories imported from CSV that need mapping
- Shows category name and type
- Two options for each unmapped category:
  1. **Map to Existing**: Opens a dialog to select an existing category to map to
  2. **Keep as New**: Keeps the category as a new, standalone category

**Mapping Dialog:**
- Shows CSV category name
- Dropdown to select existing category with icon and description
- Saves the mapping for future imports
- Updates the category to remove `needs_mapping` flag

## User Workflow

### First-Time CSV Import with New Accounts/Categories

1. **Upload CSV** on Transactions page
2. System automatically:
   - Imports transactions
   - Creates accounts that don't match existing ones (marked as "needs mapping")
   - Creates categories that don't match existing ones (marked as "needs mapping")
   - Shows summary: "Imported X transactions. Created Y accounts, Z categories."

3. **Navigate to Accounts page**
   - See orange warning banner: "New Accounts from CSV Import (Y)"
   - For each account, choose:
     - **Map to Existing**: Select which existing account this should be linked to
     - **Keep as New**: Keep as a separate account

4. **Navigate to Budget Categories page**
   - See orange warning banner: "New Categories from CSV Import (Z)"
   - For each category, choose:
     - **Map to Existing**: Select which existing category this should be linked to
     - **Keep as New**: Keep as a separate category

### Subsequent CSV Imports

- Mapped accounts/categories are automatically applied
- Only new, unmapped accounts/categories will appear in the warning sections
- Transactions automatically use the mapped accounts/categories

## Technical Implementation

### Files Modified

1. **`frontend/src/services/firebase-api.js`**
   - Added `getAccountMappings()`
   - Added `createAccountMapping(csvName, targetAccountId)`
   - Added `deleteAccountMapping(id)`
   - Added `getCategoryMappings()`
   - Added `createCategoryMapping(csvName, targetCategoryId)`
   - Added `deleteCategoryMapping(id)`

2. **`frontend/src/pages/Transactions.vue`**
   - Enhanced CSV import to:
     - Load existing mappings
     - Auto-create accounts with `needs_mapping` flag
     - Auto-create categories with `needs_mapping` flag
     - Apply mappings to transactions
     - Handle "Original Statement" field mapping

3. **`frontend/src/pages/Accounts.vue`**
   - Added `unmappedAccounts` computed property
   - Added `regularAccounts` computed property
   - Added mapping dialog UI
   - Added functions:
     - `openMappingDialog(account)`
     - `closeMappingDialog()`
     - `saveAccountMapping()`
     - `keepAsNewAccount(account)`

4. **`frontend/src/pages/BudgetCategories.vue`**
   - Added `unmappedCategories` computed property
   - Added `regularCategories` computed property
   - Added mapping dialog UI
   - Added functions:
     - `openCategoryMappingDialog(category)`
     - `closeCategoryMappingDialog()`
     - `saveCategoryMapping()`
     - `keepAsNewCategory(category)`

5. **`firestore.indexes.json`**
   - Added index for `account_mappings` collection
   - Added index for `category_mappings` collection

## Database Schema Updates

### Accounts Collection
**New Fields:**
- `needs_mapping` (boolean) - Indicates account was auto-created from CSV and needs review
- `csv_imported` (boolean) - Indicates account was imported from CSV
- `mapped_to` (string, optional) - If mapped, the ID of the target account

### Categories Collection
**New Fields:**
- `needs_mapping` (boolean) - Indicates category was auto-created from CSV and needs review
- `csv_imported` (boolean) - Indicates category was imported from CSV
- `mapped_to` (string, optional) - If mapped, the ID of the target category

## CSV Format

The CSV import expects the following columns:
- `Date` - Transaction date (required)
- `Merchant` - Merchant name (required)
- `Amount` - Transaction amount (required, negative for expenses, positive for income)
- `Account` - Account name (optional, will be auto-created if not found)
- `Category` - Category name (optional, will be auto-created if not found)
- `Original Statement` - Full statement description (maps to transaction description)
- `Notes` - Additional notes (fallback if Original Statement is empty)

## Future Enhancements

Potential improvements:
1. Bulk mapping interface (map multiple accounts/categories at once)
2. Fuzzy matching suggestions (e.g., "Did you mean...?")
3. Ability to edit/delete mappings
4. Import history log
5. Undo mapping functionality
6. Export mappings for backup/sharing

## Deployment Steps

1. **Deploy Firestore Indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```
   Wait for indexes to build (may take a few minutes)

2. **Deploy Frontend:**
   ```bash
   git add -A
   git commit -m "Add CSV import mapping feature for accounts and categories"
   git push
   ```
   This will trigger Vercel deployment

3. **Test the Feature:**
   - Upload a CSV with new accounts/categories
   - Verify accounts/categories are auto-created
   - Check Accounts page for unmapped accounts section
   - Check Budget Categories page for unmapped categories section
   - Test mapping functionality
   - Upload same CSV again to verify mappings work

## Notes

- Mappings are stored per user
- Mappings are case-insensitive
- Once mapped, all future imports with the same CSV name will use the mapped account/category
- Users can change their mind and remap at any time by updating the account/category through the UI
