#!/bin/bash

# Live Stream Load Testing Script
# Tests WebRTC + Supabase Realtime performance for live streaming

set -e

echo "🎥 Live Stream Load Testing"
echo "============================"

# Configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_KEY="${SUPABASE_KEY}"
STREAM_ID="${STREAM_ID:-test-stream-$(date +%s)}"

if [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: SUPABASE_KEY environment variable is required"
  echo "Usage: SUPABASE_KEY=your-key ./test-live-stream.sh"
  exit 1
fi

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
  echo "📦 Installing k6..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install k6
  fi
fi

echo ""
echo "🎬 Starting live stream session..."

# Create a test stream
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/live-stream-session" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"action\": \"start\"}")

STREAM_ID=$(echo $RESPONSE | jq -r '.streamId')

if [ -z "$STREAM_ID" ] || [ "$STREAM_ID" == "null" ]; then
  echo "❌ Failed to create stream session"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Stream created: $STREAM_ID"

echo ""
echo "📊 Test 1: 1k Concurrent Viewers"
echo "================================="

k6 run \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_KEY="$SUPABASE_KEY" \
  -e STREAM_ID="$STREAM_ID" \
  --out json=test-results-1k.json \
  k6-tests/live-stream-load-test.js

echo ""
echo "📊 Test 2: 5k Concurrent Viewers (Spike Test)"
echo "=============================================="

# Modify k6 config for 5k spike test
k6 run \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_KEY="$SUPABASE_KEY" \
  -e STREAM_ID="$STREAM_ID" \
  --stage "0s:0,30s:1000,1m:5000,2m:5000,30s:0" \
  --out json=test-results-5k.json \
  k6-tests/live-stream-load-test.js

echo ""
echo "🛑 Stopping stream session..."

curl -s -X POST "${SUPABASE_URL}/functions/v1/live-stream-session" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"action\": \"stop\", \"streamId\": \"${STREAM_ID}\"}" > /dev/null

echo "✅ Stream stopped"

echo ""
echo "📈 Analyzing Results..."
echo "======================="

# Parse results
CHAT_P50=$(jq -r '.metrics.chat_latency_ms.values["p(50)"]' test-results-1k.json)
CHAT_P95=$(jq -r '.metrics.chat_latency_ms.values["p(95)"]' test-results-1k.json)
GIFT_P50=$(jq -r '.metrics.gift_latency_ms.values["p(50)"]' test-results-1k.json)
ERRORS=$(jq -r '.metrics.connection_errors.values.count' test-results-1k.json)

echo ""
echo "Results Summary (1k viewers):"
echo "-----------------------------"
echo "Chat Latency P50: ${CHAT_P50}ms"
echo "Chat Latency P95: ${CHAT_P95}ms"
echo "Gift Latency P50: ${GIFT_P50}ms"
echo "Connection Errors: ${ERRORS}"

# Check acceptance criteria
PASSED=true

if (( $(echo "$CHAT_P50 > 300" | bc -l) )); then
  echo "❌ FAILED: Chat latency P50 (${CHAT_P50}ms) exceeds 300ms target"
  PASSED=false
fi

if (( $(echo "$GIFT_P50 > 500" | bc -l) )); then
  echo "❌ FAILED: Gift latency P50 (${GIFT_P50}ms) exceeds 500ms target"
  PASSED=false
fi

if [ "$ERRORS" -gt 10 ]; then
  echo "❌ FAILED: Too many connection errors (${ERRORS})"
  PASSED=false
fi

echo ""
if [ "$PASSED" = true ]; then
  echo "✅ All acceptance criteria PASSED"
  echo "   - Chat latency P50 < 300ms ✓"
  echo "   - Gift latency P50 < 500ms ✓"
  echo "   - Connection errors < 10 ✓"
  echo "   - Stable for 1k concurrent viewers ✓"
  exit 0
else
  echo "❌ Some acceptance criteria FAILED"
  exit 1
fi
