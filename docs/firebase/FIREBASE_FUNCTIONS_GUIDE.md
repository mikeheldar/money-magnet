# Firebase Functions Guide

## 📁 Where is the Code?

The Firebase Functions code is located in:
```
functions/index.js
```

This is the main file containing all your Firebase Cloud Functions, including:
- `getUserCategoriesHttp` (line 993)
- `checkCategoryMappingHttp` (line 805)
- `saveCategoryMappingHttp` (line 858)
- And all other functions

## ✏️ How to Edit

1. **Edit the code:**
   ```bash
   # Open in your editor
   code functions/index.js
   # or
   nano functions/index.js
   # or use any editor you prefer
   ```

2. **Test locally (optional):**
   ```bash
   cd functions
   npm install  # if you haven't already
   ```

3. **Deploy to Firebase:**
   ```bash
   # From project root
   firebase deploy --only functions
   
   # Or deploy specific function
   firebase deploy --only functions:getUserCategoriesHttp
   ```

## 📊 How to View Logs

### Option 1: Firebase CLI (Recommended)
```bash
# View all function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only getUserCategoriesHttp

# Follow logs in real-time (like tail -f)
firebase functions:log --only getUserCategoriesHttp --follow

# View last 50 logs
firebase functions:log --only getUserCategoriesHttp --limit 50
```

### Option 2: Firebase Console (Web UI)
1. Go to https://console.firebase.google.com
2. Select your project: `money-magnet-cf5a4`
3. Click "Functions" in the left sidebar
4. Click on the function name (e.g., `getUserCategoriesHttp`)
5. Click the "Logs" tab

### Option 3: Google Cloud Console
1. Go to https://console.cloud.google.com
2. Select your project: `money-magnet-cf5a4`
3. Navigate to "Cloud Functions" → Select function → "Logs"

## 🔍 Quick Debug Commands

```bash
# View recent logs for getUserCategoriesHttp
firebase functions:log --only getUserCategoriesHttp --limit 20

# View logs with timestamps
firebase functions:log --only getUserCategoriesHttp --format json

# Search logs for specific text
firebase functions:log | grep "getUserCategoriesHttp"
```

## 🚀 Deployment Workflow

1. **Edit code:**
   ```bash
   # Edit functions/index.js
   code functions/index.js
   ```

2. **Deploy:**
   ```bash
   firebase deploy --only functions:getUserCategoriesHttp
   ```

3. **Check logs:**
   ```bash
   firebase functions:log --only getUserCategoriesHttp --follow
   ```

4. **Test in N8N:**
   - Trigger your workflow
   - Check the logs to see what the function received and returned

## 📝 Current Function Code Location

- **getUserCategoriesHttp**: `functions/index.js` line 993
- **checkCategoryMappingHttp**: `functions/index.js` line 805
- **saveCategoryMappingHttp**: `functions/index.js` line 858

## 🐛 Debugging Tips

1. **Add more logging:**
   ```javascript
   console.log('🔵 [Function] Variable value:', variableName);
   ```

2. **Check what the function receives:**
   ```javascript
   console.log('🔵 [Function] Full request:', JSON.stringify(request, null, 2));
   ```

3. **Check what the function returns:**
   ```javascript
   const result = { categories, suggested_category };
   console.log('✅ [Function] Returning:', JSON.stringify(result, null, 2));
   return result;
   ```



