# N8N Workflow Setup for Smart Transaction Categorization

This guide explains how to set up N8N workflows for automatic transaction categorization with learning capabilities.

## Overview

The system uses N8N to:
1. **Auto-categorize** new transactions based on learned patterns and AI
2. **Learn** from user corrections to improve future categorizations
3. **Match** similar transactions using normalized merchant/description patterns

## Architecture

```
New Transaction Created
  ↓
Firebase Function (onTransactionCreated)
  ↓
N8N Webhook: categorize-transaction
  ↓
Check Learned Mappings → If found: Use it (confidence 1.0)
  ↓
If not found: AI Categorization → Suggest category (confidence 0.8)
  ↓
Update Transaction with category_id
```

```
User Changes Category
  ↓
Firebase Function (onTransactionUpdated)
  ↓
N8N Webhook: learn-category
  ↓
Save Pattern → Future similar transactions use this category
```

## Prerequisites

1. **N8N Instance** (self-hosted or cloud)
   - Self-hosted: `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`
   - Cloud: Sign up at https://n8n.cloud

2. **Firebase Functions** configured with N8N webhook URL

## Setup Steps

### 1. Configure N8N Webhook URL

Set the N8N webhook base URL in Firebase:

```bash
# Option 1: Environment variable (recommended for production)
firebase functions:config:set n8n.webhook_url="https://your-n8n-instance.com/webhook"

# Option 2: Or set as secret (more secure)
firebase functions:secrets:set N8N_WEBHOOK_URL
# Then enter: https://your-n8n-instance.com/webhook
```

### 2. Create N8N Workflow 1: Categorize Transaction

**Webhook URL:** `/webhook/categorize-transaction`

**Workflow Nodes:**

#### Node 1: Webhook (Trigger)
- **Method:** POST
- **Path:** `categorize-transaction`
- **Response Mode:** Respond to Webhook

#### Node 2: Function - Normalize Pattern
```javascript
// Normalize merchant/description for matching
const description = $input.item.json.description || '';
const merchant = $input.item.json.merchant || '';

// Normalize: uppercase, remove special chars
const normalize = (str) => {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizedMerchant = normalize(merchant);
const normalizedDescription = normalize(description);
const pattern = normalizedMerchant || normalizedDescription;

return {
  ...$input.item.json,
  pattern: pattern,
  normalized_merchant: normalizedMerchant,
  normalized_description: normalizedDescription
};
```

#### Node 3: HTTP Request - Check Learned Mapping
- **Method:** POST
- **URL:** `https://YOUR_PROJECT.cloudfunctions.net/checkCategoryMapping`
- **Authentication:** Bearer Token (Firebase Auth token)
- **Body:**
```json
{
  "user_id": "{{ $json.user_id }}",
  "pattern": "{{ $json.pattern }}",
  "transaction_type": "{{ $json.type }}"
}
```

#### Node 4: IF - Mapping Found?
- **Condition:** `{{ $json.mapping_found }} === true`

#### Node 5: Set - Use Learned Category (True Branch)
```json
{
  "category_id": "{{ $json.category_id }}",
  "category_name": "{{ $json.category_name }}",
  "confidence": 1.0,
  "source": "learned"
}
```

#### Node 6: Function - AI Categorization (False Branch)
```javascript
// Simple keyword-based categorization
// You can enhance this with OpenAI, Hugging Face, etc.
const description = $input.item.json.description || '';
const merchant = $input.item.json.merchant || '';
const text = (merchant + ' ' + description).toLowerCase();

// Category keyword mapping
const categories = {
  'groceries': ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'grocery', 'supermarket'],
  'restaurants': ['restaurant', 'mcdonald', 'burger', 'pizza', 'subway', 'chipotle', 'taco', 'dining'],
  'coffee': ['starbucks', 'dunkin', 'coffee', 'cafe', 'espresso'],
  'gas': ['shell', 'exxon', 'chevron', 'gas station', 'bp', 'mobil', 'fuel'],
  'utilities': ['electric', 'water', 'gas company', 'utility', 'power', 'energy'],
  'rent': ['rent', 'apartment', 'housing', 'lease'],
  'transportation': ['uber', 'lyft', 'taxi', 'metro', 'transit', 'bus', 'train'],
  'shopping': ['amazon', 'ebay', 'store', 'retail', 'shop'],
  'entertainment': ['netflix', 'spotify', 'movie', 'theater', 'concert'],
  'healthcare': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'medical'],
  'subscriptions': ['subscription', 'membership', 'monthly'],
};

let suggestedCategory = null;
let confidence = 0.6;

for (const [cat, keywords] of Object.entries(categories)) {
  if (keywords.some(keyword => text.includes(keyword))) {
    suggestedCategory = cat;
    confidence = 0.8;
    break;
  }
}

return {
  ...$input.item.json,
  suggested_category: suggestedCategory,
  confidence: confidence,
  source: "ai"
};
```

#### Node 7: HTTP Request - Get User Categories
- **Method:** POST
- **URL:** `https://YOUR_PROJECT.cloudfunctions.net/getUserCategories`
- **Body:**
```json
{
  "user_id": "{{ $json.user_id }}",
  "type": "{{ $json.type }}"
}
```

#### Node 8: Function - Match Category
```javascript
// Match suggested category to user's actual category ID
const suggested = $input.item.json.suggested_category;
const userCategories = $input.item.json.categories || [];

if (!suggested) {
  return {
    ...$input.item.json,
    category_id: null,
    category_name: null,
    confidence: 0.5
  };
}

// Find matching category (fuzzy match)
const match = userCategories.find(cat => {
  const catName = cat.name.toLowerCase();
  return catName.includes(suggested) || 
         suggested.includes(catName) ||
         catName === suggested;
});

// If no exact match, try parent categories
let finalMatch = match;
if (!finalMatch) {
  // Try to find parent category
  const parentMatch = userCategories.find(cat => {
    if (cat.parent_id) {
      const parent = userCategories.find(p => p.id === cat.parent_id);
      if (parent) {
        const parentName = parent.name.toLowerCase();
        return parentName.includes(suggested) || suggested.includes(parentName);
      }
    }
    return false;
  });
  finalMatch = parentMatch;
}

return {
  ...$input.item.json,
  category_id: finalMatch ? finalMatch.id : null,
  category_name: finalMatch ? finalMatch.name : null,
  confidence: finalMatch ? 0.8 : 0.5
};
```

#### Node 9: Respond to Webhook
```json
{
  "category_id": "{{ $json.category_id }}",
  "category_name": "{{ $json.category_name }}",
  "confidence": "{{ $json.confidence }}",
  "source": "{{ $json.source || 'ai' }}"
}
```

### 3. Create N8N Workflow 2: Learn from Corrections

**Webhook URL:** `/webhook/learn-category`

#### Node 1: Webhook (Trigger)
- **Method:** POST
- **Path:** `learn-category`
- **Response Mode:** Respond to Webhook

#### Node 2: Function - Normalize Pattern
```javascript
const merchant = $input.item.json.merchant || '';
const description = $input.item.json.description || '';

const normalize = (str) => {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const pattern = normalize(merchant) || normalize(description);

return {
  ...$input.item.json,
  pattern: pattern,
  match_type: merchant ? 'merchant' : 'description'
};
```

#### Node 3: HTTP Request - Save Mapping
- **Method:** POST
- **URL:** `https://YOUR_PROJECT.cloudfunctions.net/saveCategoryMapping`
- **Body:**
```json
{
  "user_id": "{{ $json.user_id }}",
  "pattern": "{{ $json.pattern }}",
  "category_id": "{{ $json.new_category_id }}",
  "transaction_type": "{{ $json.transaction_type }}",
  "match_type": "{{ $json.match_type }}",
  "confidence": 1.0
}
```

#### Node 4: Respond to Webhook
```json
{
  "success": true,
  "message": "Category mapping saved"
}
```

## Testing

### Test Workflow 1: Categorization

1. Create a test transaction in Firestore:
```javascript
// In Firebase Console or via API
{
  user_id: "test-user-id",
  description: "STARBUCKS STORE #1234",
  merchant: "STARBUCKS",
  amount: 5.50,
  type: "expense",
  date: "2024-01-15"
}
```

2. Check N8N execution logs to see the workflow run
3. Verify transaction gets `category_id` and `category_suggested: true`

### Test Workflow 2: Learning

1. Update a transaction's category (change `category_id`)
2. Check N8N execution logs
3. Create another similar transaction
4. Verify it uses the learned category

## Firestore Collections

### category_mappings
```javascript
{
  user_id: string,
  pattern: string,           // Normalized merchant/description
  category_id: string,
  category_name: string,
  transaction_type: string, // "income" or "expense"
  match_type: string,       // "merchant" or "description"
  confidence: number,       // 1.0 for user-confirmed, 0.8 for AI
  usage_count: number,
  last_used: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

## Advanced: Using AI APIs

To enhance categorization, you can add AI API calls in the workflow:

### OpenAI Integration
```javascript
// In N8N Function node
const openaiResponse = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'You are a financial transaction categorizer. Return only the category name.'
    }, {
      role: 'user',
      content: `Categorize this transaction: ${description} at ${merchant}`
    }]
  }
});

const aiCategory = openaiResponse.choices[0].message.content;
```

### Hugging Face Integration
```javascript
// Use a pre-trained financial categorization model
const hfResponse = await $http.request({
  method: 'POST',
  url: 'https://api-inference.huggingface.co/models/your-model',
  headers: {
    'Authorization': `Bearer ${$env.HF_API_KEY}`
  },
  body: {
    inputs: `${merchant} ${description}`
  }
});
```

## Monitoring

### Check N8N Execution Logs
- Go to N8N dashboard → Executions
- Filter by workflow name
- Check for errors or failed executions

### Check Firebase Function Logs
```bash
firebase functions:log --only onTransactionCreated
firebase functions:log --only onTransactionUpdated
```

### Monitor Category Mappings
Query Firestore `category_mappings` collection to see learned patterns:
```javascript
// In Firebase Console
db.collection('category_mappings')
  .where('user_id', '==', 'user-id')
  .orderBy('usage_count', 'desc')
  .get()
```

## Troubleshooting

### N8N Not Receiving Webhooks
1. Check webhook URL is correct in Firebase config
2. Verify N8N is accessible from Firebase Functions
3. Check N8N workflow is active
4. Review N8N execution logs

### Categories Not Being Applied
1. Check Firebase Function logs for errors
2. Verify transaction doesn't already have `category_id`
3. Check N8N workflow execution status
4. Verify user has categories in Firestore

### Learning Not Working
1. Verify `onTransactionUpdated` function is deployed
2. Check that transaction has `category_suggested: true` before update
3. Review N8N learn-category workflow execution
4. Check `category_mappings` collection for saved patterns

## Next Steps

1. **Deploy Firebase Functions:**
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Set N8N Webhook URL:**
   ```bash
   firebase functions:config:set n8n.webhook_url="https://your-n8n.com/webhook"
   ```

3. **Import N8N Workflows:**
   - Copy workflow JSON from this guide
   - Import into N8N
   - Activate workflows

4. **Test with Sample Transactions**

5. **Monitor and Iterate:**
   - Review categorization accuracy
   - Adjust AI prompts/keywords
   - Add more category mappings

## Security Notes

- N8N webhooks should be secured (use authentication tokens)
- Firebase Functions require authentication
- Category mappings are user-specific (isolated by `user_id`)
- Never expose API keys in workflow code (use environment variables)


