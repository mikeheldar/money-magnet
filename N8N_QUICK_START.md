# N8N Quick Start Guide

## What This Does

Automatically categorizes transactions using AI and learns from your corrections.

## How It Works

1. **New Transaction** → AI suggests a category → Transaction gets `category_id` and shows "AI" badge
2. **You Change Category** → System learns the pattern → Future similar transactions use your choice

## Setup (5 Minutes)

### Step 1: Install N8N

**Option A: Docker (Recommended)**
```bash
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

**Option B: Cloud (Easiest)**
- Sign up at https://n8n.cloud
- Get your webhook URL

### Step 2: Configure Firebase

```bash
# Set your N8N webhook base URL
firebase functions:config:set n8n.webhook_url="https://your-n8n-instance.com/webhook"
```

### Step 3: Deploy Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### Step 4: Create N8N Workflows

1. Open N8N (http://localhost:5678 or your cloud URL)
2. Create new workflow: "Categorize Transaction"
3. Add Webhook node:
   - Method: POST
   - Path: `categorize-transaction`
4. Add Function node with normalization code (see N8N_SETUP.md)
5. Add HTTP Request to call `checkCategoryMapping`
6. Add IF node to check if mapping found
7. Add AI categorization (Function node with keyword matching)
8. Add HTTP Request to get user categories
9. Add Function to match category
10. Add Respond to Webhook node

Repeat for "Learn Category" workflow (see N8N_SETUP.md for details).

### Step 5: Activate Workflows

Click "Active" toggle in N8N to activate both workflows.

## Testing

1. Create a transaction without a category
2. Wait a few seconds
3. Check transaction - it should have a category and "AI" badge
4. Change the category
5. Create another similar transaction
6. It should use your corrected category!

## Troubleshooting

**No categories being applied?**
- Check Firebase Function logs: `firebase functions:log`
- Verify N8N workflows are active
- Check webhook URL is correct

**Learning not working?**
- Verify transaction had `category_suggested: true` before you changed it
- Check N8N "learn-category" workflow is active
- Review Firestore `category_mappings` collection

## Next Steps

- Enhance AI with OpenAI API (see N8N_SETUP.md)
- Add more keyword patterns
- Monitor categorization accuracy

For detailed setup, see `N8N_SETUP.md`.


