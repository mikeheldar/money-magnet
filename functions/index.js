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
      
      // Validate and clean header values (remove any invalid characters)
      const cleanClientId = String(clientId).trim().replace(/[\r\n\t]/g, '');
      const cleanSecret = String(secret).trim().replace(/[\r\n\t]/g, '');
      
      console.log('🔵 [Function] Creating Plaid client with cleaned credentials');
      console.log('  - Client ID length:', cleanClientId.length);
      console.log('  - Secret length:', cleanSecret.length);
      
      plaidClient = new PlaidApi(
        new Configuration({
          basePath: PlaidEnvironments.sandbox, // Use sandbox for development
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': cleanClientId,
              'PLAID-SECRET': cleanSecret,
            },
          },
        })
      );
      console.log('✅ [Function] Plaid client initialized successfully');
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
    const accountIdMap = {}; // Map Plaid account_id to Firestore account doc ID

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

      let accountRef;
      if (existingAccountQuery.empty) {
        // Create new account
        accountRef = admin.firestore().collection('accounts').doc();
        batch.set(accountRef, accountData);
        createdAccounts.push({ id: accountRef.id, ...accountData });
      } else {
        // Update existing account
        accountRef = existingAccountQuery.docs[0].ref;
        batch.update(accountRef, {
          ...accountData,
          created_at: existingAccountQuery.docs[0].data().created_at, // Preserve original created_at
        });
        createdAccounts.push({ id: accountRef.id, ...accountData });
      }
      
      // Store mapping for transactions
      accountIdMap[plaidAccountId] = accountRef.id;
    }

    await batch.commit();
    console.log(`✅ [Function] Successfully created/updated ${createdAccounts.length} accounts.`);

    // Fetch transactions from Plaid
    console.log('🔵 [Function] Fetching transactions from Plaid...');
    let transactions = [];
    let transactionsCount = 0;
    
    try {
      // Get transactions for the last 2 years (Plaid default is 30 days, but we can request more)
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();
      
      // Format dates as YYYY-MM-DD strings
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`🔵 [Function] Requesting transactions from ${startDateStr} to ${endDateStr}`);
      
      // Plaid transactionsGet may return paginated results
      let allTransactions = [];
      let hasMore = true;
      let cursor = null;
      
      while (hasMore) {
        const requestParams = {
          access_token: accessToken,
          start_date: startDateStr,
          end_date: endDateStr,
        };
        
        if (cursor) {
          requestParams.cursor = cursor;
        }
        
        const transactionsResponse = await client.transactionsGet(requestParams);
        const pageTransactions = transactionsResponse.data.transactions || [];
        allTransactions = allTransactions.concat(pageTransactions);
        
        // Check if there are more pages
        hasMore = transactionsResponse.data.has_more || false;
        cursor = transactionsResponse.data.next_cursor || null;
        
        console.log(`🔵 [Function] Fetched ${pageTransactions.length} transactions (total: ${allTransactions.length}, has_more: ${hasMore})`);
      }

      transactions = allTransactions;
      console.log(`✅ [Function] Found ${transactions.length} total transactions from Plaid.`);

      // Get existing transactions to avoid duplicates
      const existingTransactionsQuery = await admin.firestore()
        .collection('transactions')
        .where('user_id', '==', userId)
        .where('external_id', '!=', null)
        .get();
      
      const existingTransactionIds = new Set(
        existingTransactionsQuery.docs.map(doc => doc.data().external_id)
      );
      console.log(`🔵 [Function] Found ${existingTransactionIds.size} existing transactions with external_id.`);

      // Get default categories for mapping
      const categoriesSnapshot = await admin.firestore()
        .collection('categories')
        .where('user_id', '==', userId)
        .get();
      
      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Map Plaid transaction category to our category
      const mapPlaidCategory = (plaidCategory) => {
        if (!plaidCategory || !plaidCategory.length) return null;
        
        // Try to find matching category by name
        const primaryCategory = plaidCategory[0];
        const categoryName = primaryCategory.toLowerCase();
        
        // Simple mapping - can be enhanced
        const categoryMap = {
          'food and drink': 'Groceries',
          'shops': 'Shopping',
          'travel': 'Travel',
          'gas stations': 'Transport',
          'general merchandise': 'Shopping',
          'entertainment': 'Entertainment',
          'recreation': 'Entertainment',
        };
        
        const mappedName = categoryMap[categoryName] || primaryCategory;
        const category = categories.find(c => 
          c.name.toLowerCase() === mappedName.toLowerCase()
        );
        
        return category?.id || null;
      };

      // Batch write transactions
      const transactionBatch = admin.firestore().batch();
      let newTransactionsCount = 0;

      for (const plaidTransaction of transactions) {
        // Skip if transaction already exists
        if (existingTransactionIds.has(plaidTransaction.transaction_id)) {
          continue;
        }

        // Get Firestore account ID from mapping
        const firestoreAccountId = accountIdMap[plaidTransaction.account_id];
        if (!firestoreAccountId) {
          console.warn(`⚠️ [Function] No account mapping found for Plaid account_id: ${plaidTransaction.account_id}`);
          continue;
        }

        // Determine transaction type based on amount
        // Plaid amounts: positive = debit (money out/expense), negative = credit (money in/income)
        // For credit cards: positive = charge (expense), negative = payment (income)
        // For bank accounts: positive = withdrawal (expense), negative = deposit (income)
        const amount = Math.abs(plaidTransaction.amount);
        const type = plaidTransaction.amount > 0 ? 'expense' : 'income';

        // Map Plaid category
        const categoryId = mapPlaidCategory(plaidTransaction.category);

        const transactionData = {
          user_id: userId,
          account_id: firestoreAccountId,
          category_id: categoryId,
          type: type,
          amount: amount,
          description: plaidTransaction.name || plaidTransaction.merchant_name || 'Transaction',
          merchant: plaidTransaction.merchant_name || null,
          date: plaidTransaction.date, // Plaid date is already in YYYY-MM-DD format
          posted_at: plaidTransaction.authorized_date ? 
            admin.firestore.Timestamp.fromDate(new Date(plaidTransaction.authorized_date)) : null,
          external_id: plaidTransaction.transaction_id, // Use Plaid transaction_id to prevent duplicates
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        const transactionRef = admin.firestore().collection('transactions').doc();
        transactionBatch.set(transactionRef, transactionData);
        newTransactionsCount++;
      }

      if (newTransactionsCount > 0) {
        await transactionBatch.commit();
        console.log(`✅ [Function] Successfully imported ${newTransactionsCount} new transactions.`);
        transactionsCount = newTransactionsCount;
      } else {
        console.log('ℹ️ [Function] No new transactions to import (all already exist).');
      }
    } catch (error) {
      console.error('❌ [Function] Error fetching/importing transactions:', error);
      // Don't fail the whole sync if transactions fail - accounts are more important
      console.warn('⚠️ [Function] Continuing without transactions...');
    }

    return { 
      accounts: createdAccounts,
      accountsCount: createdAccounts.length,
      transactionsCount: transactionsCount,
      totalTransactionsFound: transactions.length
    };
  } catch (error) {
    console.error('Error syncing accounts:', error);
    throw new functions.https.HttpsError('internal', 'Failed to sync accounts', error);
  }
});

