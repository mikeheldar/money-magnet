# Debugging Webhook Calls - Log Guide

## What to Look For

When you create a transaction, you should see logs in this order:

### 1. Frontend Logs (Browser Console)

Open your browser's Developer Console (F12) and look for:

```
🔵 [Transactions Page] onAddTransaction called
🔵 [Transactions Page] New transaction data: {...}
🔵 [Frontend] Creating transaction...
🔵 [Frontend] User ID: ...
🔵 [Frontend] Transaction data: {...}
🔵 [Frontend] Adding to Firestore collection "transactions"...
✅ [Frontend] Transaction created in Firestore!
✅ [Frontend] Document ID: ...
✅ [Frontend] This should trigger onTransactionCreated Firebase Function
```

### 2. Firebase Function Logs

Check Firebase logs with:
```bash
firebase functions:log | grep -i "onTransactionCreated\|N8N\|webhook"
```

Or view in Firebase Console: Functions → onTransactionCreated → Logs

You should see:

```
🔵 [Function] ============================================
🔵 [Function] onTransactionCreated TRIGGERED
🔵 [Function] Transaction ID: ...
🔵 [Function] Transaction data: {...}
🔵 [Function] Getting N8N webhook URL...
🔵 [Function] Webhook URL: https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction
🔵 [Function] Calling N8N webhook...
🔵 [Function] URL: ...
🔵 [Function] Payload: {...}
```

### 3. Success Path

If everything works, you'll see:

```
✅ [Function] N8N RESPONSE RECEIVED
✅ [Function] Status: 200
✅ [Function] Response data: {"category_id": "...", "category_name": "..."}
✅ [Function] Transaction updated successfully!
```

### 4. Error Paths

**If webhook URL is missing:**
```
⚠️ [Function] N8N webhook URL not configured!
⚠️ [Function] Set it with: firebase functions:secrets:set N8N_WEBHOOK_URL
```

**If N8N returns 404:**
```
❌ [Function] N8N CATEGORIZATION ERROR
❌ [Function] Response status: 404
❌ [Function] Response data: {"message": "The requested webhook \"categorize-transaction\" is not registered."}
```
→ **Solution:** Activate the workflow in N8N

**If N8N workflow has errors:**
```
❌ [Function] Response status: 500
❌ [Function] Response data: {...}
```
→ **Solution:** Check N8N execution logs for workflow errors

**If no response from N8N:**
```
❌ [Function] Request was made but no response received
```
→ **Solution:** Check N8N is running and accessible

## Quick Debug Steps

1. **Create a transaction** in your app
2. **Check browser console** - Should see frontend logs
3. **Check Firebase logs** - Should see function triggered
4. **Check N8N Executions** - Should see workflow execution
5. **Check transaction** - Should have category after a few seconds

## Common Issues

### Issue: No logs in browser console
- **Cause:** Console might be filtered
- **Fix:** Clear filters, check "All levels"

### Issue: Function not triggered
- **Cause:** Transaction might already have category_id
- **Fix:** Create transaction WITHOUT category_id

### Issue: Function triggered but no N8N call
- **Cause:** Webhook URL not set or wrong
- **Fix:** Check `firebase functions:secrets:access N8N_WEBHOOK_URL`

### Issue: N8N called but 404
- **Cause:** Workflow not active or wrong path
- **Fix:** Activate workflow in N8N, verify path is `categorize-transaction`

### Issue: N8N called but no execution
- **Cause:** Workflow might be in test mode
- **Fix:** Make sure workflow is ACTIVE (not just test mode)

## Testing Right Now

1. Open browser console (F12)
2. Create a new transaction
3. Watch the logs flow:
   - Frontend → Firebase Function → N8N → Response
4. Check each step for errors




