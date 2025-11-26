const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

admin.initializeApp();

// Set global options for 2nd gen functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  secrets: ['PLAID_CLIENT_ID', 'PLAID_SECRET'], // Declare secrets for v2 functions
});

// Get Plaid credentials from environment variables (v2 functions use env vars, not config)
const getPlaidConfig = () => {
  try {
    // For v2 functions, secrets are available as environment variables
    // They're declared in setGlobalOptions above
    let clientId = process.env.PLAID_CLIENT_ID;
    let secret = process.env.PLAID_SECRET;
    
    // Trim whitespace and newlines that might have been added when setting secrets
    if (clientId) clientId = clientId.trim();
    if (secret) secret = secret.trim();
    
    console.log('🔵 [Function] Checking Plaid credentials...');
    console.log('  - PLAID_CLIENT_ID:', clientId ? `Set (length: ${clientId.length}, first 8: ${clientId.substring(0, 8)})` : 'Missing');
    console.log('  - PLAID_SECRET:', secret ? `Set (length: ${secret.length})` : 'Missing');
    
    // Validate the values don't contain invalid characters
    if (clientId) {
      const invalidChars = /[\r\n\t]/.test(clientId);
      if (invalidChars) {
        console.error('❌ [Function] PLAID_CLIENT_ID contains invalid characters (newlines/tabs)');
        clientId = clientId.replace(/[\r\n\t]/g, '');
        console.log('  - Trimmed clientId, new length:', clientId.length);
      }
    }
    
    if (secret) {
      const invalidChars = /[\r\n\t]/.test(secret);
      if (invalidChars) {
        console.error('❌ [Function] PLAID_SECRET contains invalid characters (newlines/tabs)');
        secret = secret.replace(/[\r\n\t]/g, '');
        console.log('  - Trimmed secret, new length:', secret.length);
      }
    }
    
    if (!clientId || !secret) {
      console.error('❌ [Function] Plaid credentials not found in environment variables');
      throw new Error('Plaid credentials not configured. Please set secrets: firebase functions:secrets:set PLAID_CLIENT_ID PLAID_SECRET');
    }
    
    console.log('✅ [Function] Plaid credentials found and validated');
    return { clientId, secret };
  } catch (error) {
    console.error('❌ [Function] Error getting Plaid config:', error);
    throw error;
  }
};

// Initialize Plaid client (lazy-loaded)
let plaidClient = null;
const getPlaidClient = () => {
  if (!plaidClient) {
    try {
      const { clientId, secret } = getPlaidConfig();
      plaidClient = new PlaidApi(
        new Configuration({
          basePath: PlaidEnvironments.sandbox, // Use sandbox for development
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': clientId,
              'PLAID-SECRET': secret,
            },
          },
        })
      );
      console.log('Plaid client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Plaid client:', error);
      throw error;
    }
  }
  return plaidClient;
};

// Create Plaid Link Token
exports.createPlaidLinkToken = onCall(async (request) => {
  console.log('🔵 [Function] createPlaidLinkToken called');
  console.log('🔵 [Function] Request data:', JSON.stringify(request.data || {}, null, 2));
  console.log('🔵 [Function] Request auth:', request.auth ? 'Present' : 'Missing');
  
  // Verify authentication
  if (!request.auth) {
    console.error('❌ [Function] No authentication');
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  console.log('🔵 [Function] User ID:', userId);
  
  console.log('🔵 [Function] Getting Plaid client...');
  let client;
  try {
    client = getPlaidClient();
    console.log('✅ [Function] Plaid client obtained');
  } catch (error) {
    console.error('❌ [Function] Failed to get Plaid client:', error);
    throw new functions.https.HttpsError('failed-precondition', 'Plaid client not initialized. Please check configuration.', error);
  }

  try {
    const plaidRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Money Magnet',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    console.log('🔵 [Function] Creating Plaid link token request:', JSON.stringify(plaidRequest, null, 2));
    console.log('🔵 [Function] Calling Plaid API...');
    const response = await client.linkTokenCreate(plaidRequest);
    console.log('✅ [Function] Plaid API response received');
    console.log('✅ [Function] Response status:', response.status);
    console.log('✅ [Function] Link token present:', !!response.data?.link_token);
    
    if (!response.data?.link_token) {
      console.error('❌ [Function] No link_token in Plaid response:', JSON.stringify(response.data, null, 2));
      throw new Error('No link_token in Plaid response');
    }
    
    console.log('✅ [Function] Link token created successfully');
    return { link_token: response.data.link_token };
  } catch (error) {
    console.error('❌ [Function] Error creating link token:');
    console.error('  - Error type:', error.constructor?.name);
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    
    if (error.response) {
      console.error('  - Response status:', error.response.status);
      console.error('  - Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.response?.data) {
      const plaidError = error.response.data;
      console.error('  - Plaid error code:', plaidError.error_code);
      console.error('  - Plaid error message:', plaidError.error_message);
      console.error('  - Plaid error type:', plaidError.error_type);
      
      throw new functions.https.HttpsError(
        'internal',
        `Plaid error: ${plaidError.error_message || plaidError.error_code || 'Unknown error'}`,
        plaidError
      );
    }
    
    console.error('  - Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw new functions.https.HttpsError('internal', `Failed to create link token: ${error.message}`, error);
  }
});

// Exchange Public Token for Access Token
exports.exchangePlaidToken = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { publicToken } = request.data;
  const userId = request.auth.uid;
  const client = getPlaidClient();

  if (!publicToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Public token is required');
  }

  try {
    // Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Store access token in Firestore
    await admin.firestore().collection('plaid_items').doc(itemId).set({
      user_id: userId,
      access_token: accessToken,
      item_id: itemId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { 
      access_token: accessToken,
      item_id: itemId,
      success: true 
    };
  } catch (error) {
    console.error('Error exchanging token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to exchange token', error);
  }
});

// Sync Plaid Accounts
exports.syncPlaidAccounts = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accessToken } = request.data;
  const userId = request.auth.uid;
  const client = getPlaidClient();

  if (!accessToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Access token is required');
  }

  try {
    // Get accounts from Plaid
    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;
    const institutionId = accountsResponse.data.item.institution_id;

    // Get institution info
    let institutionName = 'Unknown Institution';
    try {
      const institutionResponse = await client.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      institutionName = institutionResponse.data.institution.name;
    } catch (err) {
      console.warn('Could not fetch institution name:', err);
    }

    // Get account types from Firestore
    const accountTypesSnapshot = await admin.firestore()
      .collection('account_types')
      .where('user_id', '==', userId)
      .get();

    const accountTypes = accountTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Map Plaid account types to our account types
    const mapPlaidType = (plaidType, plaidSubtype) => {
      const typeMap = {
        'depository': {
          'checking': 'checking',
          'savings': 'savings',
          'cd': 'savings',
          'money market': 'savings',
        },
        'credit': {
          'credit card': 'credit_card',
        },
        'loan': {
          'auto': 'loan',
          'mortgage': 'mortgage',
          'student': 'loan',
          'personal': 'loan',
        },
        'investment': {
          'investment': 'investment',
        },
      };

      const subtype = plaidSubtype?.toLowerCase() || '';
      return typeMap[plaidType]?.[subtype] || 'other';
    };

    // Create or update accounts in Firestore
    const batch = admin.firestore().batch();
    const createdAccounts = [];

    for (const account of accounts) {
      const plaidAccountId = account.account_id;
      const accountTypeCode = mapPlaidType(account.type, account.subtype);
      
      // Find matching account type
      const accountType = accountTypes.find(t => t.code === accountTypeCode) || accountTypes[0];

      const accountData = {
        user_id: userId,
        name: account.name,
        type: accountTypeCode,
        account_type_id: accountType?.id || null,
        balance_current: account.balances.current || 0,
        balance_available: account.balances.available || account.balances.current || 0,
        currency: account.balances.iso_currency_code || 'USD',
        institution_id: institutionId,
        institution_name: institutionName,
        plaid_account_id: plaidAccountId,
        plaid_item_id: accessToken, // Store reference to Plaid item
        is_closed: account.balances.current === null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Check if account already exists
      const existingAccountQuery = await admin.firestore()
        .collection('accounts')
        .where('user_id', '==', userId)
        .where('plaid_account_id', '==', plaidAccountId)
        .limit(1)
        .get();

      if (existingAccountQuery.empty) {
        // Create new account
        const accountRef = admin.firestore().collection('accounts').doc();
        batch.set(accountRef, accountData);
        createdAccounts.push({ id: accountRef.id, ...accountData });
      } else {
        // Update existing account
        const accountRef = existingAccountQuery.docs[0].ref;
        batch.update(accountRef, {
          ...accountData,
          created_at: admin.firestore.FieldValue.serverTimestamp(), // Don't overwrite created_at
        });
        createdAccounts.push({ id: accountRef.id, ...accountData });
      }
    }

    await batch.commit();

    return { 
      accounts: createdAccounts,
      count: createdAccounts.length 
    };
  } catch (error) {
    console.error('Error syncing accounts:', error);
    throw new functions.https.HttpsError('internal', 'Failed to sync accounts', error);
  }
});

