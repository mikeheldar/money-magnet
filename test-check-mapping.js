const axios = require('axios');

// Test input (simulate what comes from "Normalize Pattern" node)
const testInput = {
  user_id: 'YOUR_USER_ID_HERE', // Replace with actual user ID
  description: 'McDonald\'s #1234',
  merchant: 'McDonald\'s',
  type: 'expense',
  amount: -12.50,
  date: '2024-01-15',
  transaction_id: 'test-123',
  pattern: 'MCDONALDS', // Normalized pattern
  normalized_merchant: 'MCDONALDS',
  normalized_description: 'MCDONALDS 1234'
};

// Firebase Function URL
const FIREBASE_URL = 'https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp';

// Simulate the "Check Learned Mapping" Code node
async function testCheckMapping() {
  console.log('📥 Input data (from "Normalize Pattern" node):');
  console.log(JSON.stringify(testInput, null, 2));
  console.log('\n');

  try {
    // Preserve all original input fields
    const originalData = {
      user_id: testInput.user_id || '',
      description: testInput.description || '',
      merchant: testInput.merchant || '',
      type: testInput.type || '',
      amount: testInput.amount || 0,
      date: testInput.date || '',
      transaction_id: testInput.transaction_id || '',
      pattern: testInput.pattern || '',
      normalized_merchant: testInput.normalized_merchant || '',
      normalized_description: testInput.normalized_description || ''
    };

    // Prepare request body for Firebase function
    const requestBody = {
      data: {
        user_id: originalData.user_id,
        pattern: originalData.pattern,
        transaction_type: originalData.type
      }
    };

    console.log('📤 Request to Firebase:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n');

    // Make the HTTP request
    const response = await axios.post(FIREBASE_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Raw Firebase response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');

    // Handle Firebase callable function response wrapper
    const httpResponse = response.data;
    const result = httpResponse.result || httpResponse;

    // Extract mapping data
    const mapping_found = result.mapping_found || false;
    const category_id = result.category_id || null;
    const category_name = result.category_name || null;
    const confidence = result.confidence || 1.0;

    // Return all original fields plus mapping response (simulating Code node output)
    const processed = {
      ...originalData,
      mapping_found: mapping_found,
      category_id: category_id,
      category_name: category_name,
      confidence: confidence,
      source: mapping_found ? 'learned' : null
    };

    console.log('✅ Processed output (what goes to "Mapping Found?" node):');
    console.log(JSON.stringify(processed, null, 2));
    console.log('\n');

    // Test the "Mapping Found?" condition
    const mappingFound = processed.mapping_found === true;
    console.log(`🔍 Mapping Found? ${mappingFound ? '✅ YES' : '❌ NO'}`);
    
    if (mappingFound) {
      console.log(`   Category: ${processed.category_name} (ID: ${processed.category_id})`);
      console.log(`   Confidence: ${processed.confidence}`);
      console.log(`   Source: ${processed.source}`);
    } else {
      console.log('   → Will proceed to "AI Categorization" node');
    }

    console.log('\n📋 All preserved fields:');
    console.log(`   user_id: ${processed.user_id}`);
    console.log(`   description: ${processed.description}`);
    console.log(`   merchant: ${processed.merchant}`);
    console.log(`   type: ${processed.type}`);
    console.log(`   pattern: ${processed.pattern}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    process.exit(1);
  }
}

// Run the test
console.log('🧪 Testing "Check Learned Mapping" Code Node\n');
console.log('='.repeat(60));
console.log('');

testCheckMapping()
  .then(() => {
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
  })
  .catch((error) => {
    console.log('');
    console.log('='.repeat(60));
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });



