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
});

// Get Plaid credentials from config (lazy-loaded)
const getPlaidConfig = () => {
  try {
    const config = functions.config();
    const clientId = config?.plaid?.client_id || process.env.PLAID_CLIENT_ID;
    const secret = config?.plaid?.secret || process.env.PLAID_SECRET;
    
    if (!clientId || !secret) {
      console.error('Plaid credentials not found in config');
      throw new Error('Plaid credentials not configured');
    }
    
    return { clientId, secret };
  } catch (error) {
    console.error('Error getting Plaid config:', error);
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
  // Verify authentication
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const client = getPlaidClient();

  try {
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Money Magnet',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    console.log('Creating Plaid link token for user:', userId);
    const response = await client.linkTokenCreate(request);
    console.log('Link token created successfully');
    return { link_token: response.data.link_token };
  } catch (error) {
    console.error('Error creating link token:', error);
    console.error('Error details:', JSON.stringify(error.response?.data || error.message, null, 2));
    
    // Provide more specific error messages
    if (error.response?.data) {
      const plaidError = error.response.data;
      throw new functions.https.HttpsError(
        'internal',
        `Plaid error: ${plaidError.error_message || plaidError.error_code || 'Unknown error'}`,
        plaidError
      );
    }
    
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

