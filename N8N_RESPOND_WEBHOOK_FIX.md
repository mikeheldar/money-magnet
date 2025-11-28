# Fix "Respond to Webhook" Node

## The Problem
The workflow succeeds but no category is being updated because:
1. The response body might not be formatted correctly
2. The data from "Merge Results" might not have the expected fields

## Solution: Fix the Response Body

### Step 1: Update "Respond to Webhook" Node

1. Click on the **"Respond to Webhook"** node
2. Make sure **"Respond With"** is set to **"JSON"**
3. In the **"Response Body"** field, switch to **Expression** mode (click the "Expression" button, not "Fixed")
4. Use this code:

```javascript
JSON.stringify({
  category_id: $json.category_id || null,
  category_name: $json.category_name || null,
  confidence: $json.confidence || 0.8,
  source: $json.source || 'ai'
})
```

### Step 2: Check What Data is Available

Before fixing, check what data "Merge Results" is outputting:

1. Click on the **"Merge Results"** node
2. Click **"Execute Node"** to see its output
3. Check the OUTPUT panel - you should see fields like:
   - `category_id`
   - `category_name`
   - `confidence`
   - `source`

If these fields are missing, the issue is earlier in the workflow.

### Step 3: Verify Data Flow

The workflow should flow like this:
1. **Webhook** → receives transaction data
2. **Normalize Pattern** → adds `pattern`, `user_id`, `type`
3. **Check Learned Mapping** → checks for learned category
4. **Mapping Found?** → branches:
   - **If YES** → **Use Learned Category** → sets `category_id`, `category_name`, `confidence`, `source`
   - **If NO** → **AI Categorization** → **Get User Categories** → **Match Category** → sets `category_id`, `category_name`, `confidence`, `source`
5. **Merge Results** → combines the data
6. **Respond to Webhook** → sends response back

### Step 4: Check Firebase Logs

After the workflow runs, check Firebase Function logs:

```bash
firebase functions:log --only onTransactionCreated
```

Look for:
- `✅ [Function] N8N RESPONSE RECEIVED`
- `✅ [Function] Response data:` - this should show the category_id
- `✅ [Function] Transaction updated successfully!`

If you see `ℹ️ [Function] N8N did not return a category_id`, then the response body isn't being sent correctly.

## Alternative: Use Fixed Mode with Expressions

If Expression mode doesn't work, try Fixed mode:

1. Switch to **"Fixed"** mode
2. Use this JSON:

```json
{
  "category_id": "={{ $json.category_id }}",
  "category_name": "={{ $json.category_name }}",
  "confidence": "={{ $json.confidence || 0.8 }}",
  "source": "={{ $json.source || 'ai' }}"
}
```

## Debugging Tips

1. **Execute "Merge Results" node** to see what data it outputs
2. **Check Firebase logs** to see what response was received
3. **Verify the response format** matches what Firebase expects: `{ category_id: "...", category_name: "...", confidence: 0.8, source: "ai" }`


