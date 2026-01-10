# Fix N8N Request Body Configuration

## ✅ Good News: URL is Correct!
The URL is now correct: `https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp`

## ❌ Problem: Request Body is Empty
The error shows the request body is `{ "": "" }` which is why you're getting `400 Bad Request`.

## 🔧 Fix: Change Body Configuration

### In the "Check Learned Mapping" Node:

1. **Find "Specify Body"** section
2. **Change from "Using Fields Below"** to **"Using JSON"**
3. **In the JSON field**, paste this:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "pattern": "{{ $json.pattern }}",
       "transaction_type": "{{ $json.type }}"
     }
   }
   ```

### Alternative: If you see "Specify Body" with options:
- Select **"JSON"** (not "Fields")
- Paste the JSON above

### Step-by-Step Screenshot Guide:

1. Click on **"Check Learned Mapping"** node
2. Scroll down to **"Specify Body"** or **"Body"** section
3. You should see options like:
   - "Using Fields Below" ❌ (currently selected)
   - "Using JSON" ✅ (select this)
4. After selecting "Using JSON", you'll see a text area
5. Paste the JSON code above into that text area
6. **Save** the node

## Do the Same for "Get User Categories" Node:

1. Click **"Get User Categories"** node
2. Change **"Specify Body"** to **"Using JSON"**
3. Paste:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "type": "{{ $json.type || 'expense' }}"
     }
   }
   ```

## And for "Save Mapping" Node (in Learn Category workflow):

1. Click **"Save Mapping"** node
2. Change **"Specify Body"** to **"Using JSON"**
3. Paste:
   ```json
   {
     "data": {
       "user_id": "{{ $json.user_id }}",
       "pattern": "{{ $json.pattern }}",
       "category_id": "{{ $json.new_category_id }}",
       "transaction_type": "{{ $json.transaction_type }}",
       "match_type": "{{ $json.match_type || 'description' }}",
       "confidence": 1.0
     }
   }
   ```

## Test After Fixing:

1. **Save** the workflow
2. Click **"Execute Node"** on the "Check Learned Mapping" node
3. You should see a successful response with `{"result": {"mapping_found": false}}`

## Why This Happened:

N8N has two ways to send request bodies:
- **"Using Fields Below"**: Creates body from form fields (what you have now - empty)
- **"Using JSON"**: Sends raw JSON (what you need)

The workflow JSON file has the correct configuration, but when you imported it or edited the node, N8N may have switched to "Using Fields Below" mode.




