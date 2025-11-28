# Verify N8N URL Configuration

## ✅ Functions Are Deployed and Working

I've verified that all Firebase functions are deployed and accessible:
- ✅ `checkCategoryMappingHttp` - HTTP 200
- ✅ `getUserCategoriesHttp` - HTTP 200  
- ✅ `saveCategoryMappingHttp` - HTTP 200

## 🔍 The Problem

The error "The requested URL /checkCategoryMapping was not found" means N8N is trying to use a **relative URL** (`/checkCategoryMapping`) instead of the **full URL** (`https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp`).

## 🔧 How to Fix in N8N

### Step 1: Open the "Check Learned Mapping" Node

1. Go to your N8N workflow "Categorize Transaction"
2. Click on the **"Check Learned Mapping"** node

### Step 2: Verify the URL Field

Look at the **URL** field. It should be:

```
https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp
```

**Common mistakes:**
- ❌ `/checkCategoryMapping` (missing domain)
- ❌ `checkCategoryMapping` (missing https://)
- ❌ `https://money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping` (missing region)
- ❌ `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMapping` (wrong function name, missing `Http`)

### Step 3: Check the URL Expression

The URL field should have an **`=`** at the beginning (this tells N8N to evaluate it as an expression):

```
=https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp
```

If you see the `=` symbol, that's correct. If not, you can either:
- Add the `=` prefix, OR
- Remove it and use the plain URL (both work)

### Step 4: Test the Node

1. Click **"Execute Node"** or **"Test workflow"**
2. Check the output - you should see a response like:
   ```json
   {
     "result": {
       "mapping_found": false
     }
   }
   ```

### Step 5: Update Other Nodes

Do the same for:
- **"Get User Categories"** node:
  ```
  https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp
  ```

- **"Save Mapping"** node (in Learn Category workflow):
  ```
  https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp
  ```

## 🧪 Test the Functions Directly

You can test the functions directly using curl:

```bash
# Test checkCategoryMappingHttp
curl -X POST https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp \
  -H "Content-Type: application/json" \
  -d '{"data": {"user_id": "test", "pattern": "MCDONALDS", "transaction_type": "expense"}}'
```

Or run the test script:
```bash
./test-firebase-functions.sh
```

## 📸 Screenshot Checklist

When checking the N8N node, verify:
- [ ] URL starts with `https://`
- [ ] URL includes `us-central1-` (region)
- [ ] URL includes `money-magnet-cf5a4` (project ID)
- [ ] URL includes `.cloudfunctions.net`
- [ ] Function name ends with `Http` (e.g., `checkCategoryMappingHttp`)
- [ ] Method is set to `POST`
- [ ] Body Content Type is `JSON`
- [ ] Body contains the `data` wrapper

## 🚨 Still Not Working?

If you've verified all of the above and it's still not working:

1. **Check N8N Execution Logs**: Look at the actual HTTP request being made
2. **Check Firebase Logs**: `firebase functions:log` to see if requests are reaching the function
3. **Try a simple test**: Create a new HTTP Request node in N8N with just the URL and test it

## 💡 Quick Fix: Re-import Workflow

The easiest solution is to re-import the updated workflow JSON:

1. Delete the existing "Categorize Transaction" workflow in N8N
2. Import `n8n-workflows/categorize-transaction.json`
3. Activate the workflow
4. Test it

The JSON file has the correct URLs already configured.


