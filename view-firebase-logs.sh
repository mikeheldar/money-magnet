#!/bin/bash

# Helper script to view Firebase Function logs

FUNCTION_NAME=${1:-"getUserCategoriesHttp"}
LINES=${2:-50}

echo "📊 Viewing logs for: $FUNCTION_NAME"
echo "📋 Showing last $LINES lines"
echo ""
echo "Press Ctrl+C to exit"
echo ""

firebase functions:log --only "$FUNCTION_NAME" --lines "$LINES"

