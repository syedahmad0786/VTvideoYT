#!/bin/bash
# Test the deployed Malik Zaid Agent
URL="${1:-https://vtvideoyt.vercel.app}"
echo "=== Testing Malik Zaid Agent at $URL ==="

# 1. Health check
echo ""
echo "--- Health Check ---"
HEALTH=$(curl -s "$URL/api/health")
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

# 2. Status check
echo ""
echo "--- Agent Status ---"
STATUS=$(curl -s "$URL/api/status")
echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"

# 3. Chat test
echo ""
echo "--- Chat Test ---"
CHAT=$(curl -s -X POST "$URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Malik, introduce yourself and tell me what you can do."}')
echo "$CHAT" | python3 -m json.tool 2>/dev/null || echo "$CHAT"

# 4. Auth status
echo ""
echo "--- Auth Status ---"
AUTH=$(curl -s "$URL/api/auth/status")
echo "$AUTH" | python3 -m json.tool 2>/dev/null || echo "$AUTH"

# 5. Work log
echo ""
echo "--- Work Log ---"
LOG=$(curl -s "$URL/api/worklog?limit=5")
echo "$LOG" | python3 -m json.tool 2>/dev/null || echo "$LOG"

echo ""
echo "=== All tests complete ==="
