# N8N Workflow Import Guide

## Quick Import (Easiest Method)

### Step 1: Import the Workflow JSON

1. In N8N, click the **three dots menu** (⋮) in the top right
2. Select **"Import from File"** or **"Import from URL"**
3. Navigate to the workflow JSON file:
   - `n8n-workflows/categorize-transaction.json`
   - `n8n-workflows/learn-category.json`
4. Click **"Import"**

### Step 2: Update Firebase Project ID

After importing, you need to update the Firebase Function URLs:

1. Click on the **"Check Learned Mapping"** HTTP Request node
2. Update the URL to use your actual Firebase project ID:
   - Current: `https://money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping`
   - Replace `money-magnet-cf5a4` with your actual project ID
   - Find your project ID in Firebase Console → Project Settings

3. Do the same for:
   - **"Get User Categories"** node
   - **"Save Mapping"** node (in Learn Category workflow)

### Step 3: Activate Workflows

1. Toggle the **"Active"** switch in the top right (should turn green)
2. Click **"Save"**

### Step 4: Test

Test the webhook with:

```bash
curl -X POST https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "description": "STARBUCKS STORE",
    "merchant": "STARBUCKS",
    "amount": 5.50,
    "type": "expense",
    "date": "2024-01-15"
  }'
```

## Manual Setup (If Import Doesn't Work)

If you prefer to build manually, follow the node-by-node guide in `N8N_SETUP.md`.

## Troubleshooting

### Workflow Not Executing
- Make sure workflow is **Active** (green toggle)
- Check N8N execution logs
- Verify webhook URL is correct

### Firebase Function Errors
- Check Firebase Function logs: `firebase functions:log`
- Verify project ID in HTTP Request nodes
- Make sure functions are deployed: `firebase deploy --only functions`

### Authentication Issues
- Firebase Functions require authentication
- Make sure you're calling from authenticated context
- Check Firebase Function logs for auth errors

