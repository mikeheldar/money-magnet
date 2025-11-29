# N8N Setup Complete! ✅

## What's Been Configured

### ✅ Firebase Functions Deployed
- `onTransactionCreated` - Triggers N8N when new transaction is created
- `onTransactionUpdated` - Learns from user corrections
- `checkCategoryMapping` - Checks for learned patterns
- `saveCategoryMapping` - Saves user corrections
- `getUserCategories` - Gets user's categories for matching

### ✅ Firebase Config Set
- N8N webhook URL: `https://money-magnet-cf5a4.app.n8n.cloud/webhook-test`

### ✅ N8N Workflow Files Created
- `n8n-workflows/categorize-transaction.json` - Main categorization workflow
- `n8n-workflows/learn-category.json` - Learning workflow

## Next Steps: Import Workflows into N8N

### Step 1: Import "Categorize Transaction" Workflow

1. In N8N, click the **three dots menu** (⋮) in the top right
2. Select **"Import from File"**
3. Navigate to: `n8n-workflows/categorize-transaction.json`
4. Click **"Import"**

### Step 2: Import "Learn Category" Workflow

1. Repeat the same process for: `n8n-workflows/learn-category.json`

### Step 3: Activate Both Workflows

1. For each workflow, toggle the **"Active"** switch (top right) to green
2. Click **"Save"** for each workflow

### Step 4: Verify Webhook URLs

The workflows are already configured with:
- Webhook path: `categorize-transaction` and `learn-category`
- Firebase Function URLs: `https://money-magnet-cf5a4.cloudfunctions.net/...`

No changes needed unless you want to use production URLs instead of test URLs.

## Testing

### Test Categorization

1. Create a transaction in your app without a category
2. Wait a few seconds
3. Check the transaction - it should have a category and "AI" badge
4. Check N8N executions to see the workflow run

### Test Learning

1. Change the category of an auto-categorized transaction
2. Create another similar transaction
3. It should use your corrected category!

### Manual Test with curl

```bash
curl -X POST https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "description": "STARBUCKS STORE",
    "merchant": "STARBUCKS",
    "amount": 5.50,
    "type": "expense",
    "date": "2024-01-15"
  }'
```

## Monitoring

### Check N8N Executions
- Go to N8N → Executions tab
- See all workflow runs and their results

### Check Firebase Function Logs
```bash
firebase functions:log --only onTransactionCreated
firebase functions:log --only onTransactionUpdated
```

### Check Firestore
- View `category_mappings` collection to see learned patterns
- View `transactions` collection to see `category_suggested: true` flag

## Troubleshooting

### Categories Not Being Applied
1. Check N8N workflows are **Active**
2. Check Firebase Function logs for errors
3. Verify webhook URL in Firebase config matches N8N instance
4. Check N8N execution logs for errors

### Learning Not Working
1. Verify transaction had `category_suggested: true` before you changed it
2. Check `onTransactionUpdated` function logs
3. Check N8N "Learn Category" workflow is active
4. Review Firestore `category_mappings` collection

### Firebase Function Errors
- Check authentication - functions require authenticated users
- Verify project ID in N8N HTTP Request nodes
- Check Firebase Console for function errors

## What Happens Now

1. **New Transaction Created** → Firebase Function triggers N8N
2. **N8N Checks Learned Patterns** → If found, uses that category (confidence 1.0)
3. **If Not Found** → AI suggests category based on keywords (confidence 0.8)
4. **Transaction Updated** → Shows "AI" badge
5. **User Changes Category** → Firebase Function triggers learning
6. **N8N Saves Pattern** → Future similar transactions use learned category

## Success! 🎉

Your N8N integration is complete and ready to use. Just import the workflows and activate them!



