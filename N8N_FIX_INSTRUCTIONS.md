# Fix N8N Workflow - Firebase Function URLs

## Problem
The "Check Learned Mapping" node is getting a 404 error because:
1. The URL format is wrong
2. Callable functions need a specific request format

## Solution

I've created HTTP versions of the functions that don't require authentication. Update your N8N workflow nodes:

### 1. "Check Learned Mapping" Node

**URL:**
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp
```

**Method:** POST

**Body (JSON):**
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "transaction_type": "{{ $json.type }}"
  }
}
```

**Headers:**
- Content-Type: `application/json`

---

### 2. "Get User Categories" Node

**URL:**
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp
```

**Method:** POST

**Body (JSON):**
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "type": "{{ $json.type || 'expense' }}"
  }
}
```

**Headers:**
- Content-Type: `application/json`

---

### 3. "Save Mapping" Node (in Learn Category workflow)

**URL:**
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp
```

**Method:** POST

**Body (JSON):**
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "category_id": "{{ $json.new_category_id }}",
    "transaction_type": "{{ $json.transaction_type }}",
    "match_type": "{{ $json.match_type || 'description' }}",
    "confidence": 0.9
  }
}
```

**Headers:**
- Content-Type: `application/json`

---

## Important Notes

1. **Request Format**: Firebase callable functions expect the data wrapped in a `data` object
2. **No Authentication**: These HTTP versions don't require Firebase Auth (user_id is passed in the body)
3. **Response Format**: The functions return JSON directly, so you can access fields like `{{ $json.category_id }}`

## Testing

After updating the URLs, test the workflow:
1. Go to the "Categorize Transaction" workflow
2. Click "Execute Workflow" button
3. Use test data:
   ```json
   {
     "user_id": "test-user-123",
     "description": "McDonalds",
     "merchant": "McDonalds",
     "amount": 13.50,
     "type": "expense",
     "date": "2025-11-26"
   }
   ```
4. Check that all nodes execute successfully (green checkmarks)

## Next Steps

Once the workflow is working:
1. Make sure the workflow is **Active** (toggle in top right)
2. Create a transaction in your app
3. Check N8N executions to see the workflow run
4. Check your transactions page - the category should appear!


