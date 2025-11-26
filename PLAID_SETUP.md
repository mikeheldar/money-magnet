# Plaid Integration Setup Guide

## Overview
This guide will help you set up Plaid integration to connect financial institutions and automatically import accounts.

## Prerequisites
- Firebase project configured
- Firebase CLI installed (`npm install -g firebase-tools`)
- Plaid account with Client ID and Secret

## Setup Steps

### 1. Install Firebase Functions Dependencies

```bash
cd functions
npm install
```

### 2. Set Plaid Credentials in Firebase

Configure your Plaid credentials in Firebase Functions config:

```bash
firebase functions:config:set plaid.client_id="6924c74139fff60021f039db" plaid.secret="f548d507fde682834d08b04e697001"
```

**Note:** These are your sandbox credentials. For production, use your production credentials.

### 3. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

This will deploy three functions:
- `createPlaidLinkToken` - Creates a link token for Plaid Link
- `exchangePlaidToken` - Exchanges public token for access token
- `syncPlaidAccounts` - Syncs accounts from Plaid to Firestore

### 4. Test the Integration

1. Start your frontend: `cd frontend && npm run dev`
2. Navigate to the Accounts page
3. Click "Connect with Plaid" button
4. Use Plaid's sandbox credentials:
   - Username: `user_good`
   - Password: `pass_good`
5. Select a test institution (e.g., "First Platypus Bank")
6. Connect your accounts

## Testing with Plaid Sandbox

### Standard Test Credentials

Plaid provides standard test credentials that work without creating custom users:

**For basic account testing (accounts only, no transactions):**
- **Username**: `user_good`
- **Password**: `pass_good`
- ⚠️ **Note**: This user does NOT include transaction data by default

**For transaction testing (accounts + transactions):**
- **Username**: `user_transactions_dynamic`
- **Password**: Any non-blank string (e.g., `pass_good`)
- **Institution**: Use a non-OAuth institution like "First Platypus Bank" (`ins_109508`)
- ✅ **This user includes transaction data** - transactions will be imported automatically

**For MFA (Multi-Factor Authentication) testing:**
- **Username**: `user_good`
- **Password**: `mfa_device`
- Then enter code: `1234`

**For error testing:**
- **Username**: `user_good`
- **Password**: `pass_good`
- Select an institution that returns errors (e.g., "First Platypus Bank" for some error scenarios)

### Creating Custom Test Users

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/)
2. Navigate to **Sandbox** → **Test Users** tab
3. Click **"Create user"** button
4. Fill in:
   - **Username**: A unique suffix (e.g., `my_test_user`)
   - **Description**: Optional description
   - **Config**: JSON configuration (optional, for advanced testing)
5. Click **"Create user"**

Custom users allow you to:
- Test specific account scenarios
- Configure custom account data
- Test different institution responses

### Recommended Test Institutions

For Sandbox testing, use these test institutions:
- **First Platypus Bank** - General testing
- **First Gingham Credit Union** - Credit union testing
- **Bristlecone** - Investment accounts

### How It Works

1. **User clicks "Connect with Plaid"**
   - Frontend calls `createPlaidLinkToken` Firebase Function
   - Receives a link token

2. **Plaid Link opens**
   - User selects a test institution (e.g., "First Platypus Bank")
   - User enters test credentials (`user_good` / `pass_good`)
   - Plaid returns a public token

3. **Exchange token**
   - Frontend calls `exchangePlaidToken` Firebase Function
   - Public token is exchanged for an access token
   - Access token is stored in Firestore

4. **Sync accounts**
   - Frontend calls `syncPlaidAccounts` Firebase Function
   - Accounts are fetched from Plaid
   - Accounts are created/updated in Firestore
   - Account types are automatically mapped

## Account Type Mapping

Plaid account types are automatically mapped to your account types:
- `depository.checking` → Checking
- `depository.savings` → Savings
- `credit.credit card` → Credit Card
- `loan.auto` → Loan
- `loan.mortgage` → Mortgage
- `loan.student` → Loan
- `loan.personal` → Loan
- `investment.investment` → Investment
- Others → Other

## Security Notes

- Access tokens are stored securely in Firestore
- Only authenticated users can access their own Plaid items
- Plaid credentials are stored in Firebase Functions config (encrypted)
- Never expose Plaid credentials in client-side code

## Troubleshooting

### Functions not deploying
- Make sure you're logged in: `firebase login`
- Check Firebase project: `firebase use money-magnet-cf5a4`

### Link token creation fails
- Verify Plaid credentials are set correctly
- Check Firebase Functions logs: `firebase functions:log`

### Accounts not syncing
- Check browser console for errors
- Verify access token was created in Firestore
- Check Firebase Functions logs

## Production Setup

For production:
1. Switch to production Plaid environment in `functions/index.js`:
   ```javascript
   basePath: PlaidEnvironments.production
   ```
2. Set production credentials:
   ```bash
   firebase functions:config:set plaid.client_id="YOUR_PROD_CLIENT_ID" plaid.secret="YOUR_PROD_SECRET"
   ```
3. Redeploy functions

