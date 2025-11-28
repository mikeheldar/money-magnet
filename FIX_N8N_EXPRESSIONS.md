# Fix Empty Values in N8N Expressions

## Problem
The JSON expressions are showing empty values:
- `{{ $json.user_id }}` → `""`
- `{{ $json.pattern }}` → `""`
- `{{ $json.type }}` → `""`

## Solution: Test the Data Flow

### Step 1: Check What Data is Coming In

1. Click on the **"Normalize Pattern"** node (the node BEFORE "Check Learned Mapping")
2. Click **"Execute Node"** to see what data it outputs
3. Look at the OUTPUT panel - you should see fields like:
   - `user_id`
   - `description`
   - `merchant`
   - `type`
   - `pattern` (added by Normalize Pattern)
   - etc.

### Step 2: If Data is There, Try Different Expression Syntax

If the data exists in "Normalize Pattern" output, try these expressions in the JSON:

**Option 1: Use `$json` directly (no curly braces in the JSON field):**
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "transaction_type": "{{ $json.type }}"
  }
}
```

**Option 2: Try accessing from the first item:**
```json
{
  "data": {
    "user_id": "{{ $json['user_id'] }}",
    "pattern": "{{ $json['pattern'] }}",
    "transaction_type": "{{ $json['type'] }}"
  }
}
```

**Option 3: If data comes from webhook body, try:**
```json
{
  "data": {
    "user_id": "{{ $json.body.user_id || $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "transaction_type": "{{ $json.body.type || $json.type }}"
  }
}
```

### Step 3: Test with Manual Values First

To verify the function works, temporarily use hardcoded values:

```json
{
  "data": {
    "user_id": "test-user-123",
    "pattern": "MCDONALDS",
    "transaction_type": "expense"
  }
}
```

If this works, then the issue is with the expressions, not the function.

### Step 4: Check Webhook Input

1. Go back to the **"Webhook"** node
2. Click **"Execute Node"** 
3. Check the OUTPUT - this shows what data the webhook receives from Firebase
4. Note the exact field names (they might be different than expected)

### Step 5: Update Expressions Based on Actual Data

Once you see the actual data structure, update the JSON expressions to match:
- If webhook shows `body.user_id`, use `{{ $json.body.user_id }}`
- If webhook shows `user_id` directly, use `{{ $json.user_id }}`
- etc.

## Quick Test: Execute the Full Workflow

1. In N8N, go to the workflow
2. Click **"Execute Workflow"** button (top right)
3. When prompted, enter test data:
   ```json
   {
     "user_id": "test-user",
     "description": "McDonalds",
     "merchant": "McDonalds",
     "amount": 13.50,
     "type": "expense",
     "date": "2025-11-26"
   }
   ```
4. Watch each node execute and check the data at each step
5. This will show you exactly where the data is and what the correct expressions should be

## Most Likely Fix

Based on the workflow structure, the expressions should work. The issue might be:
1. **Webhook not receiving data** - Check if Firebase is actually calling the webhook
2. **Data structure different** - The webhook might wrap data in `body` or `query`
3. **Node execution order** - Make sure "Normalize Pattern" executes before "Check Learned Mapping"

Try executing the "Normalize Pattern" node first to see what data it has, then update the expressions accordingly.


