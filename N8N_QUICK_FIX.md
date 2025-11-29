# Quick Fix for N8N 404 Error

## The Problem
You're seeing: "The requested URL /checkCategoryMapping was not found"

This means your N8N workflow is using an **old or incorrect URL**.

## Quick Solution

### Option 1: Re-import the Workflows (Easiest)

1. **Delete** your existing workflows in N8N:
   - "Categorize Transaction"
   - "Learn Category"

2. **Re-import** the updated JSON files:
   - Go to N8N → Workflows → Import from File
   - Import `n8n-workflows/categorize-transaction.json`
   - Import `n8n-workflows/learn-category.json`

3. **Activate** both workflows (toggle in top right)

4. **Test** by creating a transaction in your app

---

### Option 2: Manually Update URLs

If you prefer to keep your existing workflows, update these nodes:

#### In "Categorize Transaction" workflow:

**"Check Learned Mapping" node:**
- URL: `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp`

**"Get User Categories" node:**
- URL: `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp`

#### In "Learn Category" workflow:

**"Save Mapping" node:**
- URL: `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp`

---

## Important: Response Format

Firebase callable functions return data wrapped in a `result` object:
```json
{
  "result": {
    "mapping_found": true,
    "category_id": "...",
    ...
  }
}
```

The updated workflow JSON files handle this automatically. If you're updating manually, you may need to access `$json.result.mapping_found` instead of `$json.mapping_found`.

---

## Verify It's Working

After updating:

1. **Create a transaction** in your app (without a category)
2. **Wait 5-10 seconds**
3. **Check N8N Executions** - you should see a successful execution
4. **Refresh transactions page** - the category should appear!

If you still see errors, check:
- Firebase Function logs: `firebase functions:log`
- N8N execution details for error messages



