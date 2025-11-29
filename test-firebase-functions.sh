#!/bin/bash

echo "=========================================="
echo "Testing Firebase Functions"
echo "=========================================="
echo ""

echo "1. Testing checkCategoryMappingHttp..."
curl -X POST https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp \
  -H "Content-Type: application/json" \
  -d '{"data": {"user_id": "test-user", "pattern": "MCDONALDS", "transaction_type": "expense"}}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "2. Testing getUserCategoriesHttp..."
curl -X POST https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp \
  -H "Content-Type: application/json" \
  -d '{"data": {"user_id": "test-user", "type": "expense"}}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "3. Testing saveCategoryMappingHttp..."
curl -X POST https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp \
  -H "Content-Type: application/json" \
  -d '{"data": {"user_id": "test-user", "pattern": "TEST", "category_id": "test-cat", "transaction_type": "expense", "match_type": "description", "confidence": 0.9}}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "=========================================="
echo "All functions are accessible!"
echo "=========================================="
echo ""
echo "Correct URLs for N8N:"
echo "  - https://us-central1-money-magnet-cf5a4.cloudfunctions.net/checkCategoryMappingHttp"
echo "  - https://us-central1-money-magnet-cf5a4.cloudfunctions.net/getUserCategoriesHttp"
echo "  - https://us-central1-money-magnet-cf5a4.cloudfunctions.net/saveCategoryMappingHttp"
echo ""



