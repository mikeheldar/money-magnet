# N8N Workflow Activation - Critical Step!

## The Problem

Your Firebase Function IS calling N8N, but N8N returns:
```
"The requested webhook \"categorize-transaction\" is not registered."
```

This means your workflow exists but **isn't active** or **isn't listening for webhooks**.

## Solution: Activate the Workflow

### Step 1: Open Your Workflow

1. In N8N, go to **Workflows**
2. Click on **"Learn Category"** (or whatever you named it)
3. You should see the workflow editor

### Step 2: Check the Webhook Node

1. Find the **Webhook** node (first node)
2. Click on it
3. Verify:
   - **HTTP Method:** POST
   - **Path:** `categorize-transaction` (exactly this, no spaces)
   - **Response Mode:** "Respond to Webhook"

### Step 3: Activate the Workflow

**THIS IS THE CRITICAL STEP:**

1. Look at the **top right** of the workflow editor
2. Find the toggle that says **"Active"** or **"Inactive"**
3. **Toggle it to ON (green/Active)**
4. Click **"Save"** button (red button, top right)

### Step 4: Verify It's Active

1. The toggle should be **green** and say **"Active"**
2. You should see the webhook URL displayed in the Webhook node
3. The URL should be: `https://money-magnet-cf5a4.app.n8n.cloud/webhook-test/categorize-transaction`

## Important Notes

### Test Mode vs Production Mode

- **Test Mode:** Webhook only works ONCE after clicking "Execute workflow"
- **Production Mode:** Webhook works continuously (this is what you need!)

To use production mode:
- Make sure workflow is **Active** (green toggle)
- Don't rely on "Execute workflow" - that's just for testing
- The webhook should work automatically when Active

### If You See "No Executions"

If your workflow shows "No executions" even when Active:
1. **This is normal** - executions only show AFTER a webhook is called
2. Create a transaction in your app
3. Then check Executions - you should see it appear

## Quick Test

After activating:

1. **Create a transaction** in your app (without category)
2. **Wait 5 seconds**
3. **Check N8N Executions tab** - should see a new execution
4. **Check your transaction** - should have a category now

## Troubleshooting

**Still getting 404?**
- Double-check the webhook path is exactly `categorize-transaction`
- Make sure workflow is Active (green toggle)
- Try clicking "Execute workflow" once to test, then create a transaction

**Workflow active but still no executions?**
- Check Firebase logs to see if the function is calling N8N
- Verify the webhook URL in Firebase logs matches your N8N webhook URL
- Make sure you're creating transactions WITHOUT a category_id



