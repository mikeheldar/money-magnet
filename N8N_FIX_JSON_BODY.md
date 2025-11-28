# Fix N8N "Check Learned Mapping" Node JSON Body

## The Problem
The JSON body is showing `{ "": "" }` which means the expressions aren't being evaluated correctly.

## Solution: Update the JSON Body Field

In the "Check Learned Mapping" node:

1. Make sure **"Specify Body"** is set to **"Using JSON"**
2. In the **JSON** text area, use one of these options:

### Option 1: Using JSON.stringify (Recommended)
```javascript
={{ JSON.stringify({
  data: {
    user_id: $json.user_id || '',
    pattern: $json.pattern || '',
    transaction_type: $json.type || ''
  }
}) }}
```

### Option 2: Using Template Literals
```javascript
={{ `{
  "data": {
    "user_id": "${$json.user_id || ''}",
    "pattern": "${$json.pattern || ''}",
    "transaction_type": "${$json.type || ''}"
  }
}` }}
```

### Option 3: Direct JSON (if expressions work)
```json
{
  "data": {
    "user_id": "={{ $json.user_id }}",
    "pattern": "={{ $json.pattern }}",
    "transaction_type": "={{ $json.type }}"
  }
}
```

## Important Notes

- The `=` prefix tells N8N to evaluate as JavaScript
- Use `$json.fieldName` to access data from previous node
- The `|| ''` provides fallback empty strings if values are missing
- Make sure the "Normalize Pattern" node is outputting `user_id`, `pattern`, and `type` fields

## Test After Fixing

1. Execute the "Normalize Pattern" node first to verify it outputs the correct data
2. Then execute "Check Learned Mapping" node
3. Check the OUTPUT - you should see a successful response with `{"result": {"mapping_found": false}}` or similar

## If Still Not Working

Try using a "Set" node before "Check Learned Mapping" to explicitly set the values:
- Add a "Set" node between "Normalize Pattern" and "Check Learned Mapping"
- Map the values explicitly
- Then use those mapped values in the HTTP Request node


