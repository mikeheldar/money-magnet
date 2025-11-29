#!/bin/bash
# Script to set N8N webhook URL as a Firebase secret

echo "Setting N8N webhook URL as Firebase secret..."
echo "Enter the webhook URL: https://money-magnet-cf5a4.app.n8n.cloud/webhook-test"
echo ""

firebase functions:secrets:set N8N_WEBHOOK_URL <<EOF
https://money-magnet-cf5a4.app.n8n.cloud/webhook-test
EOF

echo ""
echo "Secret set! Now redeploy functions:"
echo "firebase deploy --only functions"



