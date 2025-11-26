# Debugging N8N Categorization

## Quick Checklist

### 1. Is N8N Workflow Active?
- Go to N8N → Workflows
- Find "Categorize Transaction" workflow
- Toggle should be **green/Active** (not gray/Inactive)
- If inactive, click the toggle to activate it

### 2. Is the Webhook URL Correct?
The Firebase config shows:
```
https://money-magnet-cf5a4.app.n8n.cloud/webhook-test
```

Make sure your N8N workflow webhook path is: `categorize-transaction`

Full URL should be:
```
https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction
```

### 3. Test the Webhook Directly

Run this in your terminal:

```bash
curl -X POST https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "description": "McDonalds",
    "merchant": "McDonalds",
    "amount": 13.50,
    "type": "expense",
    "date": "2025-11-25"
  }'
```

**Expected Response:**
```json
{
  "category_id": "...",
  "category_name": "Restaurants",
  "confidence": 0.8,
  "source": "ai"
}
```

### 4. Check N8N Executions

1. Go to N8N → **Executions** tab
2. Look for recent executions
3. Click on one to see if it ran successfully
4. Check for any errors (red nodes)

### 5. Check Firebase Function Logs

```bash
firebase functions:log | grep -i "transaction\|n8n"
```

Look for:
- "New transaction created" - Function was triggered
- "Calling N8N webhook" - Attempted to call N8N
- "N8N response received" - Got response from N8N
- Any error messages

### 6. Common Issues

**Issue: Workflow Not Active**
- Solution: Activate the workflow in N8N

**Issue: Wrong Webhook Path**
- Solution: Make sure webhook path is exactly `categorize-transaction`

**Issue: Firebase Function Not Triggering**
- Solution: Check if transaction was created in Firestore
- Check Firebase Function logs for errors

**Issue: N8N Workflow Has Errors**
- Solution: Check N8N execution logs
- Look for red nodes indicating errors
- Fix any node configuration issues

**Issue: No Categories in User's Account**
- Solution: Make sure you have categories set up in Budget Categories page
- The workflow needs categories to match against

## Manual Test Steps

1. **Create a test transaction** in your app (like you did with McDonalds)
2. **Wait 5-10 seconds** for the function to trigger
3. **Check N8N Executions** - Should see a new execution
4. **Check Firebase Logs** - Should see function execution
5. **Refresh transaction** in your app - Should have category

## If Still Not Working

1. Check N8N workflow is imported and active
2. Verify webhook path matches exactly
3. Test webhook directly with curl
4. Check N8N execution logs for errors
5. Check Firebase Function logs for errors

