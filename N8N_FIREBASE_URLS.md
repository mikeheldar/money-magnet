# N8N Firebase Function URLs

## Correct URLs for N8N Workflow Nodes

Your Firebase project ID is: `money-magnet-cf5a4`

### For "Check Learned Mapping" Node:
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping
```

### For "Get User Categories" Node:
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategories
```

### For "Save Mapping" Node (in Learn Category workflow):
```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMapping
```

## Important: Request Format

These are **callable functions**, so you need to wrap the data in a `data` object:

**Request Body:**
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "transaction_type": "{{ $json.type }}"
  }
}
```

## Authentication

These functions require authentication. You may need to:
1. Add authentication headers
2. Or make the functions publicly accessible (not recommended for production)
3. Or use Firebase Admin SDK in N8N

## Quick Fix

Update your "Check Learned Mapping" HTTP Request node:
- **URL:** `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping`
- **Method:** POST
- **Body:** 
```json
{
  "data": {
    "user_id": "{{ $json.user_id }}",
    "pattern": "{{ $json.pattern }}",
    "transaction_type": "{{ $json.type }}"
  }
}
```

Do the same for "Get User Categories" and "Save Mapping" nodes.



