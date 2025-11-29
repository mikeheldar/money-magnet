const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const axios = require('axios');

admin.initializeApp();

// Set global options for 2nd gen functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  secrets: ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'N8N_WEBHOOK_URL'], // Declare secrets for v2 functions
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
      
      if (transactions.length === 0) {
        console.log('⚠️ [Function] WARNING: No transactions found in Plaid response.');
        console.log('⚠️ [Function] This is normal for the standard "user_good" test user.');
        console.log('⚠️ [Function] To test transactions, use "user_transactions_dynamic" as the username.');
      }

      // Get existing transactions to avoid duplicates
      let existingTransactionIds = new Set();
      try {
        const existingTransactionsQuery = await admin.firestore()
          .collection('transactions')
          .where('user_id', '==', userId)
          .where('external_id', '!=', null)
          .get();
        
        existingTransactionIds = new Set(
          existingTransactionsQuery.docs.map(doc => doc.data().external_id)
        );
        console.log(`🔵 [Function] Found ${existingTransactionIds.size} existing transactions with external_id.`);
      } catch (error) {
        // If index doesn't exist, we'll skip duplicate checking and import all
        // The index will be created automatically, but we don't want to fail the import
        console.warn('⚠️ [Function] Could not check for existing transactions (index may be missing). Will import all transactions.');
        console.warn('⚠️ [Function] Error:', error.message);
        console.warn('⚠️ [Function] To create the index, run: firebase deploy --only firestore:indexes');
        // Continue without duplicate checking - Firestore will handle duplicates if we try to insert the same external_id twice
      }

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
        if (transactions.length === 0) {
          console.log('ℹ️ [Function] No transactions found in Plaid response. This is normal for some test users.');
          console.log('ℹ️ [Function] To test with transactions, use a custom test user with transaction data configured.');
        } else {
          console.log(`ℹ️ [Function] Found ${transactions.length} transactions from Plaid, but all ${transactions.length} already exist in Firestore.`);
        }
      }
    } catch (error) {
      console.error('❌ [Function] Error fetching/importing transactions:', error);
      console.error('  - Error type:', error.constructor?.name);
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
      if (error.response?.data) {
        console.error('  - Plaid error response:', JSON.stringify(error.response.data, null, 2));
      }
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

// ============================================================================
// N8N Integration: Smart Transaction Categorization
// ============================================================================

// Get N8N webhook URL from environment variables (v2 functions use env vars, not config)
const getN8NWebhookUrl = (workflowName) => {
  // For v2 functions, use environment variables
  // Set via: firebase functions:secrets:set N8N_WEBHOOK_URL
  const baseUrl = (process.env.N8N_WEBHOOK_URL || '').trim().replace(/[\r\n]/g, '');
  if (!baseUrl) {
    console.warn('⚠️ [Function] N8N webhook URL not configured. Set N8N_WEBHOOK_URL environment variable: firebase functions:secrets:set N8N_WEBHOOK_URL');
    return null;
  }
  // Clean up the base URL and construct the full webhook URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '').replace(/[\r\n]/g, '');
  const fullUrl = `${cleanBaseUrl}/${workflowName}`;
  console.log('🔵 [Function] Constructed webhook URL:', fullUrl);
  return fullUrl;
};

// Trigger N8N when a new transaction is created (without category)
exports.onTransactionCreated = onDocumentCreated(
  {
    document: 'transactions/{transactionId}',
    region: 'us-central1',
  },
  async (event) => {
    const transaction = event.data.data();
    const transactionId = event.params.transactionId;

    console.log('🔵 [Function] ============================================');
    console.log('🔵 [Function] onTransactionCreated TRIGGERED');
    console.log('🔵 [Function] Transaction ID:', transactionId);
    console.log('🔵 [Function] Transaction data:', JSON.stringify(transaction, null, 2));
    console.log('🔵 [Function] ============================================');

    // Skip if already has category (user set it manually)
    if (transaction.category_id) {
      console.log('ℹ️ [Function] Transaction already has category_id:', transaction.category_id);
      console.log('ℹ️ [Function] Skipping N8N categorization');
      return null;
    }

    // Skip if it's a Plaid import that already has category
    if (transaction.plaid_category_id || transaction.external_id) {
      // Still try to categorize if no category_id
      if (!transaction.category_id) {
        console.log('🔵 [Function] Plaid transaction without category_id, will categorize');
      } else {
        console.log('ℹ️ [Function] Plaid transaction already categorized, skipping');
        return null;
      }
    }

    console.log('🔵 [Function] Getting N8N webhook URL...');
    const webhookUrl = getN8NWebhookUrl('categorize-transaction');
    console.log('🔵 [Function] Webhook URL:', webhookUrl || 'NOT SET');
    
    if (!webhookUrl) {
      console.warn('⚠️ [Function] N8N webhook URL not configured!');
      console.warn('⚠️ [Function] Set it with: firebase functions:secrets:set N8N_WEBHOOK_URL');
      return null;
    }

    // Extract merchant - use merchant field if available, otherwise try to extract from description
    let merchant = transaction.merchant || '';
    
    // If merchant is empty but description exists, try to extract merchant name from description
    if (!merchant && transaction.description) {
      const description = transaction.description.trim();
      
      // Common patterns: "MERCHANT NAME", "MERCHANT -", "MERCHANT #", etc.
      // Try to extract the first part before common separators
      const merchantPatterns = [
        /^([A-Z][A-Z0-9\s&]+?)\s*[-#]/,  // "MCDONALDS #123" or "WALMART -"
        /^([A-Z][A-Z0-9\s&]+?)\s+\d/,     // "MCDONALDS 123" (merchant followed by numbers)
        /^([A-Z][A-Z\s&]+?)(?:\s+\d|$)/,  // "MCDONALDS" or "MCDONALDS 123"
      ];
      
      for (const pattern of merchantPatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
          merchant = match[1].trim();
          // Only use if it looks like a merchant name (not too long, not all numbers)
          if (merchant.length > 2 && merchant.length < 50 && !/^\d+$/.test(merchant)) {
            break;
          }
        }
      }
      
      // If no pattern matched but description is short and looks like a merchant name, use it
      if (!merchant && description.length > 2 && description.length < 50 && 
          /^[A-Z]/.test(description) && !/^\d+/.test(description)) {
        merchant = description;
      }
    }

    const payload = {
      transaction_id: transactionId,
      user_id: transaction.user_id,
      description: transaction.description || '',
      merchant: merchant,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
    };
    
    console.log('🔵 [Function] Merchant extraction:');
    console.log('  - Original merchant:', transaction.merchant || '(empty)');
    console.log('  - Description:', transaction.description || '(empty)');
    console.log('  - Extracted merchant:', merchant || '(empty)');

    console.log('🔵 [Function] ============================================');
    console.log('🔵 [Function] Calling N8N webhook...');
    console.log('🔵 [Function] URL:', webhookUrl);
    console.log('🔵 [Function] Payload:', JSON.stringify(payload, null, 2));
    console.log('🔵 [Function] ============================================');

    try {
      const response = await axios.post(
        webhookUrl,
        payload,
        {
          timeout: 15000, // 15 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [Function] ============================================');
      console.log('✅ [Function] N8N RESPONSE RECEIVED');
      console.log('✅ [Function] Status:', response.status);
      console.log('✅ [Function] Response data:', JSON.stringify(response.data, null, 2));
      console.log('✅ [Function] ============================================');

      // Update transaction with suggested category
      if (response.data && response.data.category_id) {
        const transactionRef = admin.firestore().collection('transactions').doc(transactionId);
        const source = response.data.source || 'ai';
        const categorySource = response.data.category_source || (source === 'ai' ? 'ai' : (source === 'learned' ? 'learned' : null));
        const updateData = {
          category_id: response.data.category_id,
          category_suggested: true,
          category_confidence: response.data.confidence || 0.8,
          category_source: categorySource,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        console.log('🔵 [Function] Updating transaction with category...');
        console.log('🔵 [Function] Update data:', JSON.stringify(updateData, null, 2));
        
        await transactionRef.update(updateData);
        
        console.log('✅ [Function] Transaction updated successfully!');
        console.log('✅ [Function] Category ID:', response.data.category_id);
        console.log('✅ [Function] Category Name:', response.data.category_name);
      } else {
        console.log('ℹ️ [Function] N8N did not return a category_id');
        console.log('ℹ️ [Function] Response data:', JSON.stringify(response.data, null, 2));
      }

      return null;
    } catch (error) {
      console.error('❌ [Function] ============================================');
      console.error('❌ [Function] N8N CATEGORIZATION ERROR');
      console.error('❌ [Function] Error message:', error.message);
      console.error('❌ [Function] Error code:', error.code);
      
      if (error.response) {
        console.error('❌ [Function] Response status:', error.response.status);
        console.error('❌ [Function] Response headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('❌ [Function] Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.request) {
        console.error('❌ [Function] Request was made but no response received');
        console.error('❌ [Function] Request config:', JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        }, null, 2));
      }
      
      console.error('❌ [Function] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('❌ [Function] ============================================');
      
      // Don't throw - allow transaction to be created without category
      return null;
    }
  }
);

// Learn from user corrections when they change a category
exports.onTransactionUpdated = onDocumentUpdated(
  {
    document: 'transactions/{transactionId}',
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const transactionId = event.params.transactionId;

    console.log('🔵 [Function] Transaction updated:', transactionId);

    // Check if category was changed by user
    const categoryChanged = before.category_id !== after.category_id;
    const wasAutoCategorized = before.category_suggested === true;
    const nowHasCategory = !!after.category_id;

    if (categoryChanged && wasAutoCategorized && nowHasCategory) {
      console.log('🔵 [Function] User corrected auto-categorized transaction, learning from correction...');
      console.log(`  - Old category: ${before.category_id}`);
      console.log(`  - New category: ${after.category_id}`);

      const webhookUrl = getN8NWebhookUrl('learn-category');
      if (!webhookUrl) {
        console.warn('⚠️ [Function] N8N not configured, skipping learning');
        return null;
      }

      try {
        await axios.post(
          webhookUrl,
          {
            user_id: after.user_id,
            description: after.description || '',
            merchant: after.merchant || '',
            old_category_id: before.category_id,
            new_category_id: after.category_id,
            transaction_type: after.type,
            transaction_id: transactionId,
          },
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('✅ [Function] Learning data sent to N8N');
      } catch (error) {
        console.error('❌ [Function] N8N learning error:', error.message);
        // Don't throw - learning failure shouldn't break the update
      }
    }

    return null;
  }
);

// Helper function: Check if a category mapping exists
// HTTP version for N8N (no auth required, user_id passed in body)
// This allows N8N to call it without Firebase Auth
exports.checkCategoryMappingHttp = onCall(async (request) => {
  // Allow unauthenticated calls from N8N (user_id is in the request)
  // Extract data from either request.data (callable format) or request.body (HTTP format)
  const requestData = request.data || {};
  const { user_id, pattern, transaction_type } = requestData;
  
  console.log('🔵 [Function] checkCategoryMappingHttp called');
  console.log('🔵 [Function] Request data:', JSON.stringify(requestData, null, 2));
  
  if (!user_id || !pattern || !transaction_type) {
    console.error('❌ [Function] Missing required fields');
    throw new functions.https.HttpsError('invalid-argument', 'user_id, pattern, and transaction_type are required');
  }

  try {
    // Query category_mappings collection
    const mappingsRef = admin.firestore().collection('category_mappings');
    const snapshot = await mappingsRef
      .where('user_id', '==', user_id)
      .where('pattern', '==', pattern)
      .where('transaction_type', '==', transaction_type)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const mapping = snapshot.docs[0].data();

      // Update usage count
      await snapshot.docs[0].ref.update({
        usage_count: admin.firestore.FieldValue.increment(1),
        last_used: admin.firestore.FieldValue.serverTimestamp(),
      });

      const result = {
        mapping_found: true,
        category_id: mapping.category_id,
        category_name: mapping.category_name,
        confidence: mapping.confidence || 1.0,
      };
      
      console.log('✅ [Function] Mapping found:', result);
      return result;
    }

    console.log('ℹ️ [Function] No mapping found');
    return { mapping_found: false };
  } catch (error) {
    console.error('❌ [Function] Error checking category mapping:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check category mapping', error);
  }
});

// HTTP version for N8N (no auth required)
exports.saveCategoryMappingHttp = onCall(async (request) => {
  // Allow unauthenticated calls from N8N
  const requestData = request.data || {};
  const { user_id, pattern, category_id, transaction_type, match_type, confidence } = requestData;
  
  console.log('🔵 [Function] saveCategoryMappingHttp called');
  console.log('🔵 [Function] Request data:', JSON.stringify(requestData, null, 2));
  
  if (!user_id || !pattern || !category_id || !transaction_type) {
    throw new functions.https.HttpsError('invalid-argument', 'user_id, pattern, category_id, and transaction_type are required');
  }

  try {
    // Get category name
    const categoryDoc = await admin.firestore().collection('categories').doc(category_id).get();

    if (!categoryDoc.exists()) {
      throw new functions.https.HttpsError('not-found', 'Category not found');
    }

    const categoryName = categoryDoc.data().name;

    // Check if mapping already exists
    const mappingsRef = admin.firestore().collection('category_mappings');
    const existing = await mappingsRef
      .where('user_id', '==', user_id)
      .where('pattern', '==', pattern)
      .where('transaction_type', '==', transaction_type)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing mapping
      await existing.docs[0].ref.update({
        category_id: category_id,
        category_name: categoryName,
        confidence: confidence || 1.0,
        match_type: match_type || 'description',
        usage_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ [Function] Updated existing category mapping');
    } else {
      // Create new mapping
      await mappingsRef.add({
        user_id: user_id,
        pattern: pattern,
        category_id: category_id,
        category_name: categoryName,
        transaction_type: transaction_type,
        match_type: match_type || 'description',
        confidence: confidence || 1.0,
        usage_count: 1,
        last_used: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ [Function] Created new category mapping');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ [Function] Error saving category mapping:', error);
    throw new functions.https.HttpsError('internal', 'Failed to save category mapping', error);
  }
});

// Helper function: Save a learned category mapping (authenticated version)
exports.saveCategoryMapping = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { user_id, pattern, category_id, transaction_type, match_type, confidence } = request.data;

  if (!pattern || !category_id || !transaction_type) {
    throw new functions.https.HttpsError('invalid-argument', 'pattern, category_id, and transaction_type are required');
  }

  try {
    // Get category name
    const categoryDoc = await admin.firestore().collection('categories').doc(category_id).get();

    if (!categoryDoc.exists()) {
      throw new functions.https.HttpsError('not-found', 'Category not found');
    }

    const categoryName = categoryDoc.data().name;

    // Check if mapping already exists
    const mappingsRef = admin.firestore().collection('category_mappings');
    const existing = await mappingsRef
      .where('user_id', '==', user_id)
      .where('pattern', '==', pattern)
      .where('transaction_type', '==', transaction_type)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing mapping
      await existing.docs[0].ref.update({
        category_id: category_id,
        category_name: categoryName,
        confidence: confidence || 1.0,
        match_type: match_type || 'description',
        usage_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ [Function] Updated existing category mapping');
    } else {
      // Create new mapping
      await mappingsRef.add({
        user_id: user_id,
        pattern: pattern,
        category_id: category_id,
        category_name: categoryName,
        transaction_type: transaction_type,
        match_type: match_type || 'description',
        confidence: confidence || 1.0,
        usage_count: 1,
        last_used: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ [Function] Created new category mapping');
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving category mapping:', error);
    throw new functions.https.HttpsError('internal', 'Failed to save category mapping', error);
  }
});

// HTTP version for N8N (no auth required)
exports.getUserCategoriesHttp = onCall(async (request) => {
  // Allow unauthenticated calls from N8N
  const requestData = request.data || {};
  let { user_id, type, suggested_category } = requestData;
  
  console.log('🔵 [Function] getUserCategoriesHttp called');
  console.log('🔵 [Function] Request data:', JSON.stringify(requestData, null, 2));
  
  // Strip '=' prefix if present (N8N expression evaluation issue)
  if (user_id && typeof user_id === 'string' && user_id.startsWith('=')) {
    console.log('⚠️ [Function] Stripping = prefix from user_id');
    user_id = user_id.substring(1);
  }
  if (type && typeof type === 'string' && type.startsWith('=')) {
    console.log('⚠️ [Function] Stripping = prefix from type');
    type = type.substring(1);
  }
  if (suggested_category && typeof suggested_category === 'string' && suggested_category.startsWith('=')) {
    console.log('⚠️ [Function] Stripping = prefix from suggested_category');
    suggested_category = suggested_category.substring(1);
  }
  
  if (!user_id) {
    throw new functions.https.HttpsError('invalid-argument', 'user_id is required');
  }

  try {
    const categoriesRef = admin.firestore().collection('categories');
    let query = categoriesRef.where('user_id', '==', user_id);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('✅ [Function] Found categories:', categories.length);
    if (categories.length > 0) {
      console.log('✅ [Function] Category names:', categories.map(c => c.name).join(', '));
    }
    if (suggested_category) {
      console.log('✅ [Function] Suggested category:', suggested_category);
    }
    
    // Return suggested_category so it's preserved through the HTTP request
    const result = { 
      categories,
      suggested_category: suggested_category || null
    };
    
    console.log('✅ [Function] Returning:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [Function] Error getting user categories:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user categories', error);
  }
});

// Update all transactions for a merchant pattern and save mapping
exports.updateTransactionsForMerchant = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { merchant, pattern, category_id, category_name, transaction_type } = request.data;

  console.log('🔵 [Function] updateTransactionsForMerchant called');
  console.log('🔵 [Function] Request data:', JSON.stringify(request.data, null, 2));

  if (!merchant || !pattern || !category_id || !category_name || !transaction_type) {
    throw new functions.https.HttpsError('invalid-argument', 'merchant, pattern, category_id, category_name, and transaction_type are required');
  }

  try {
    // Normalize function (same as N8N)
    const normalize = (str) => {
      if (!str) return '';
      return str
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Find all transactions matching the pattern
    const transactionsRef = admin.firestore().collection('transactions');
    const snapshot = await transactionsRef
      .where('user_id', '==', userId)
      .where('type', '==', transaction_type)
      .get();

    let updatedCount = 0;
    const transactionsToUpdate = [];

    // Find all matching transactions
    snapshot.docs.forEach((doc) => {
      const tx = doc.data();
      const txMerchant = tx.merchant || '';
      const txDescription = tx.description || '';
      
      // Normalize and check if pattern matches
      const normalizedMerchant = normalize(txMerchant);
      const normalizedDescription = normalize(txDescription);
      const txPattern = normalizedMerchant || normalizedDescription;

      if (txPattern === pattern) {
        transactionsToUpdate.push(doc.ref);
      }
    });

    // Update transactions in batches (Firestore batch limit is 500)
    const batchSize = 500;
    for (let i = 0; i < transactionsToUpdate.length; i += batchSize) {
      const batch = admin.firestore().batch();
      const batchRefs = transactionsToUpdate.slice(i, i + batchSize);
      
      batchRefs.forEach((ref) => {
        batch.update(ref, {
          category_id: category_id,
          category_source: admin.firestore.FieldValue.delete(), // Remove AI indicator
          category_suggested: admin.firestore.FieldValue.delete(),
          category_confidence: admin.firestore.FieldValue.delete(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      updatedCount += batchRefs.length;
    }

    // Save category mapping for future transactions
    const mappingsRef = admin.firestore().collection('category_mappings');
    const existing = await mappingsRef
      .where('user_id', '==', userId)
      .where('pattern', '==', pattern)
      .where('transaction_type', '==', transaction_type)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing mapping
      await existing.docs[0].ref.update({
        category_id: category_id,
        category_name: category_name,
        confidence: 1.0,
        match_type: 'merchant',
        usage_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ [Function] Updated existing category mapping');
    } else {
      // Create new mapping
      await mappingsRef.add({
        user_id: userId,
        pattern: pattern,
        category_id: category_id,
        category_name: category_name,
        transaction_type: transaction_type,
        confidence: 1.0,
        match_type: 'merchant',
        usage_count: 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ [Function] Created new category mapping');
    }

    console.log(`✅ [Function] Updated ${updatedCount} transactions and saved mapping`);
    return {
      success: true,
      updated_count: updatedCount,
      pattern: pattern,
      category_id: category_id,
      category_name: category_name
    };
  } catch (error) {
    console.error('❌ [Function] Error updating transactions for merchant:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update transactions for merchant', error);
  }
});

// Helper function: Get user's categories (authenticated version)
exports.getUserCategories = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { user_id, type } = request.data;

  if (!user_id) {
    throw new functions.https.HttpsError('invalid-argument', 'user_id is required');
  }

  try {
    const categoriesRef = admin.firestore().collection('categories');
    let query = categoriesRef.where('user_id', '==', user_id);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { categories };
  } catch (error) {
    console.error('Error getting user categories:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user categories', error);
  }
});

// Balance Snapshots Functions
exports.createBalanceSnapshot = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { account_id, date } = request.data;

  if (!account_id) {
    throw new functions.https.HttpsError('invalid-argument', 'account_id is required');
  }

  try {
    // Get account to get current balance
    const accountRef = admin.firestore().collection('accounts').doc(account_id);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const account = accountDoc.data();
    if (account.user_id !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Use provided date or current date
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    // Create snapshot
    const snapshotRef = admin.firestore().collection('balance_snapshots');
    const snapshotData = {
      user_id: userId,
      account_id: account_id,
      account_name: account.name,
      balance: account.balance_current || 0,
      date: snapshotDate,
      is_end_of_month: false, // Manual snapshots are not end-of-month
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const snapshotDoc = await snapshotRef.add(snapshotData);

    return {
      id: snapshotDoc.id,
      ...snapshotData,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error creating balance snapshot:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create balance snapshot', error);
  }
});

exports.getBalanceSnapshots = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { account_id } = request.data;

  try {
    const snapshotsRef = admin.firestore().collection('balance_snapshots');
    let query = snapshotsRef.where('user_id', '==', userId);

    if (account_id) {
      query = query.where('account_id', '==', account_id);
    }

    query = query.orderBy('date', 'desc');

    const snapshot = await query.get();

    const snapshots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return { snapshots };
  } catch (error) {
    console.error('Error getting balance snapshots:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get balance snapshots', error);
  }
});

// Scheduled function to create end-of-month snapshots
// This should be set up as a Cloud Scheduler job that runs daily
// and checks if it's the last day of the month
exports.createEndOfMonthSnapshots = onCall(async (request) => {
  // This can be called manually or by a scheduled job
  // For scheduled jobs, we might want to allow unauthenticated calls with a secret
  const userId = request.auth?.uid || request.data?.user_id;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User ID is required');
  }

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the first day of the month (meaning today is last day)
    const isLastDayOfMonth = tomorrow.getDate() === 1;

    if (!isLastDayOfMonth && !request.data?.force) {
      return { message: 'Not the last day of the month. No snapshots created.', created: 0 };
    }

    // Get all accounts for the user
    const accountsRef = admin.firestore().collection('accounts');
    const accountsSnapshot = await accountsRef
      .where('user_id', '==', userId)
      .where('is_closed', '==', false)
      .get();

    if (accountsSnapshot.empty) {
      return { message: 'No accounts found', created: 0 };
    }

    const snapshotDate = today.toISOString().split('T')[0];
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const snapshotsRef = admin.firestore().collection('balance_snapshots');
    let createdCount = 0;

    // Check if snapshots already exist for this month
    const existingSnapshots = await snapshotsRef
      .where('user_id', '==', userId)
      .where('date', '==', snapshotDate)
      .where('is_end_of_month', '==', true)
      .get();

    const existingAccountIds = new Set(existingSnapshots.docs.map(doc => doc.data().account_id));

    // Create snapshots for accounts that don't have one yet
    for (const accountDoc of accountsSnapshot.docs) {
      const account = accountDoc.data();
      const accountId = accountDoc.id;

      // Skip if snapshot already exists for this account and date
      if (existingAccountIds.has(accountId)) {
        continue;
      }

      const snapshotData = {
        user_id: userId,
        account_id: accountId,
        account_name: account.name,
        balance: account.balance_current || 0,
        date: snapshotDate,
        month_year: monthYear,
        is_end_of_month: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await snapshotsRef.add(snapshotData);
      createdCount++;
    }

    return {
      message: `Created ${createdCount} end-of-month snapshot(s) for ${snapshotDate}`,
      created: createdCount,
      date: snapshotDate
    };
  } catch (error) {
    console.error('Error creating end-of-month snapshots:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create end-of-month snapshots', error);
  }
});

// Scheduled function to automatically create end-of-month snapshots
// Runs daily at 11:59 PM in the specified timezone
// This will check if it's the last day of the month and create snapshots for all users
exports.createEndOfMonthSnapshotsScheduled = onSchedule({
  schedule: '59 23 * * *', // Daily at 11:59 PM
  timeZone: 'America/New_York', // Adjust to your timezone
  retryConfig: {
    retryCount: 2,
    maxRetryDuration: '60s'
  }
}, async (event) => {
  console.log('🔄 [Scheduled] Checking for end-of-month snapshot creation...')
  
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Check if tomorrow is the first day of the month (meaning today is last day)
    const isLastDayOfMonth = tomorrow.getDate() === 1
    
    if (!isLastDayOfMonth) {
      console.log('ℹ️ [Scheduled] Not the last day of the month. Skipping snapshot creation.')
      return { message: 'Not the last day of the month', created: 0 }
    }
    
    console.log('✅ [Scheduled] Last day of month detected. Creating snapshots for all users...')
    
    // Get all users
    const usersRef = admin.firestore().collection('users')
    const usersSnapshot = await usersRef.get()
    
    if (usersSnapshot.empty) {
      console.log('ℹ️ [Scheduled] No users found')
      return { message: 'No users found', created: 0 }
    }
    
    const snapshotDate = today.toISOString().split('T')[0]
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    
    let totalCreated = 0
    
    // Create snapshots for each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      
      try {
        // Get all accounts for this user
        const accountsRef = admin.firestore().collection('accounts')
        const accountsSnapshot = await accountsRef
          .where('user_id', '==', userId)
          .where('is_closed', '==', false)
          .get()
        
        if (accountsSnapshot.empty) {
          continue
        }
        
        const snapshotsRef = admin.firestore().collection('balance_snapshots')
        
        // Check if snapshots already exist for this user and date
        const existingSnapshots = await snapshotsRef
          .where('user_id', '==', userId)
          .where('date', '==', snapshotDate)
          .where('is_end_of_month', '==', true)
          .get()
        
        const existingAccountIds = new Set(existingSnapshots.docs.map(doc => doc.data().account_id))
        
        // Create snapshots for accounts that don't have one yet
        for (const accountDoc of accountsSnapshot.docs) {
          const account = accountDoc.data()
          const accountId = accountDoc.id
          
          // Skip if snapshot already exists
          if (existingAccountIds.has(accountId)) {
            continue
          }
          
          const snapshotData = {
            user_id: userId,
            account_id: accountId,
            account_name: account.name,
            balance: account.balance_current || 0,
            date: snapshotDate,
            month_year: monthYear,
            is_end_of_month: true,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }
          
          await snapshotsRef.add(snapshotData)
          totalCreated++
        }
        
        console.log(`✅ [Scheduled] Created snapshots for user ${userId}`)
      } catch (userError) {
        console.error(`❌ [Scheduled] Error creating snapshots for user ${userId}:`, userError)
        // Continue with other users even if one fails
      }
    }
    
    console.log(`✅ [Scheduled] End-of-month snapshot creation complete. Created ${totalCreated} snapshot(s) for ${snapshotDate}`)
    return {
      message: `Created ${totalCreated} end-of-month snapshot(s) for ${snapshotDate}`,
      created: totalCreated,
      date: snapshotDate
    }
  } catch (error) {
    console.error('❌ [Scheduled] Error in scheduled snapshot creation:', error)
    throw error
  }
})

