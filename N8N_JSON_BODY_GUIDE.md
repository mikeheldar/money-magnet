# N8N JSON Body Configuration Guide

## The Problem
"JSON parameter needs to be valid JSON" error occurs when N8N can't parse the JSON body.

## Solution: Use Fixed Mode with Expression Syntax

For HTTP Request nodes in N8N, use **Fixed mode** (not Expression mode) with N8N's expression syntax.

### For "Get User Categories" Node:

1. Click on the **"Get User Categories"** node
2. Make sure **"Specify Body"** is set to **"Using JSON"**
3. Click **"Fixed"** button (not "Expression")
4. In the JSON text area, paste:

```json
{
  "data": {
    "user_id": "={{ $json.user_id }}",
    "type": "={{ $json.type || 'expense' }}"
  }
}
```

### For "Check Learned Mapping" Node:

1. Click **"Fixed"** button
2. Use:

```json
{
  "data": {
    "user_id": "={{ $json.user_id }}",
    "pattern": "={{ $json.pattern }}",
    "transaction_type": "={{ $json.type }}"
  }
}
```

### For "Save Mapping" Node (in Learn Category workflow):

1. Click **"Fixed"** button
2. Use:

```json
{
  "data": {
    "user_id": "={{ $json.user_id }}",
    "pattern": "={{ $json.pattern }}",
    "category_id": "={{ $json.new_category_id }}",
    "transaction_type": "={{ $json.transaction_type }}",
    "match_type": "={{ $json.match_type || 'description' }}",
    "confidence": 1.0
  }
}
```

### For "Respond to Webhook" Node:

1. Click **"Fixed"** button
2. Use:

```json
{
  "category_id": "={{ $json.category_id }}",
  "category_name": "={{ $json.category_name }}",
  "confidence": "={{ $json.confidence || 0.8 }}",
  "source": "={{ $json.source || 'ai' }}"
}
```

## Key Points

- **Use "Fixed" mode**, not "Expression" mode
- **Use `={{ }}` syntax** for dynamic values
- **Wrap expressions in quotes** when they're string values
- **Use `||` for fallback values** (e.g., `|| 'expense'`)

## Why Fixed Mode?

Fixed mode allows N8N to:
1. Validate the JSON structure
2. Evaluate `={{ }}` expressions at runtime
3. Handle the JSON properly

Expression mode expects a complete JavaScript expression that returns a string, which can be more error-prone.

## After Updating

1. Save the workflow
2. Activate it
3. Test by creating a transaction
4. Check that the JSON bodies are sent correctly


