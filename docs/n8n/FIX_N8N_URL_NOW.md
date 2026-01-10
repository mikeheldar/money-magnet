# Fix N8N URL - Step by Step

## The Problem
N8N is calling: `https://money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping`
But it should be: `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp`

## Quick Fix in N8N

### Step 1: Open "Categorize Transaction" Workflow
1. Go to your N8N instance
2. Open the "Categorize Transaction" workflow

### Step 2: Update "Check Learned Mapping" Node
1. Click on the **"Check Learned Mapping"** node
2. Find the **URL** field
3. **Replace** the current URL with:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp
   ```
4. Make sure it's **exactly** this (copy-paste to avoid typos)

### Step 3: Update "Get User Categories" Node
1. Click on the **"Get User Categories"** node
2. Find the **URL** field
3. **Replace** with:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp
   ```

### Step 4: Update "Learn Category" Workflow
1. Open the **"Learn Category"** workflow
2. Click on the **"Save Mapping"** node
3. Find the **URL** field
4. **Replace** with:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp
   ```

### Step 5: Save and Test
1. **Save** both workflows
2. **Activate** both workflows (toggle in top right)
3. **Test** by creating a transaction in your app

## What Changed?
- Added `us-central1-` (region prefix) before the project ID
- Added `Http` suffix to function names (e.g., `checkCategoryMappingHttp`)

## Verify It Works
After updating, test the workflow:
1. Create a transaction in your app (without a category)
2. Wait 5-10 seconds
3. Check N8N Executions - should see successful execution
4. Refresh transactions page - category should appear!




