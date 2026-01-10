# Fix N8N 404 Error - Update Workflow URLs

## Problem
You're getting a 404 error: "The requested URL /checkCategoryMapping was not found"

This means the N8N workflow is using an incorrect or incomplete URL.

## Solution: Update URLs in N8N

You need to manually update the URLs in your N8N workflow. Here's how:

### Step 1: Open the "Categorize Transaction" Workflow

1. Go to your N8N instance
2. Open the "Categorize Transaction" workflow

### Step 2: Update "Check Learned Mapping" Node

1. Click on the **"Check Learned Mapping"** node
2. In the **URL** field, make sure it's set to:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp
   ```
3. Verify the **Method** is set to **POST**
4. Verify the **Body** (JSON) is:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "pattern": "{{ $json.pattern }}",
       "transaction_type": "{{ $json.type }}"
     }
   }
   ```

### Step 3: Update "Get User Categories" Node

1. Click on the **"Get User Categories"** node
2. In the **URL** field, make sure it's set to:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp
   ```
3. Verify the **Method** is set to **POST**
4. Verify the **Body** (JSON) is:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "type": "{{ $json.type || 'expense' }}"
     }
   }
   ```

### Step 4: Update "Learn Category" Workflow

1. Open the **"Learn Category"** workflow
2. Click on the **"Save Mapping"** node
3. In the **URL** field, make sure it's set to:
   ```
   https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp
   ```
4. Verify the **Method** is set to **POST**
5. Verify the **Body** (JSON) is:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "pattern": "{{ $json.pattern }}",
       "category_id": "{{ $json.new_category_id }}",
       "transaction_type": "{{ $json.transaction_type }}",
       "match_type": "{{ $json.match_type || 'description' }}",
       "confidence": 1.0
     }
   }
   ```

## Important Notes

1. **Full URL Required**: The URL must include:
   - `https://`
   - Region: `us-central1-`
   - Project ID: `money-magnet-cf5a4`
   - Domain: `.cloudfunctions.net`
   - Function name: `/checkCategoryMappingHttp`

2. **Data Wrapper**: Firebase callable functions require the data to be wrapped in a `data` object

3. **Response Format**: The functions return `{"result": {...}}`, so in N8N you may need to access `{{ $json.result.mapping_found }}` instead of `{{ $json.mapping_found }}`

## Test the Fix

After updating the URLs:

1. **Save** the workflow
2. **Activate** the workflow (toggle in top right)
3. **Test** by creating a transaction in your app
4. **Check N8N Executions** - you should see successful executions
5. **Check Firebase Logs** - you should see function calls

## Alternative: Re-import Workflows

If updating manually is too tedious, you can:

1. **Delete** the existing workflows in N8N
2. **Re-import** the JSON files from `n8n-workflows/` directory:
   - `categorize-transaction.json`
   - `learn-category.json`

The JSON files have been updated with the correct URLs.




