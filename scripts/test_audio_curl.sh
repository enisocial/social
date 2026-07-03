#!/bin/bash

# Test audio file accessibility
AUDIO_URL="https://ttgpbtndxwmlxbkxjyyw.supabase.co/storage/v1/object/public/voice-posts/67982986-b1a2-499d-8037-e20bb089bf02/voice-67982986-b1a2-499d-8037-e20bb089bf02-1765921340159.m4a"

echo "🔍 Testing audio file accessibility..."
echo "URL: $AUDIO_URL"
echo ""

# Test HEAD request
echo "📡 HEAD request:"
curl -I "$AUDIO_URL"
echo ""

# Test GET request with limited bytes
echo "📥 GET request (first 100 bytes):"
curl -r 0-99 "$AUDIO_URL" | head -c 100 | od -c
echo ""

echo "✅ Test completed"
