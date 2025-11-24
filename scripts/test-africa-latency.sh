#!/bin/bash

# Test de latence pour utilisateurs africains
# Nécessite: curl, jq

set -e

# Configuration
API_BASE="${SUPABASE_URL:-https://tohgxyzfrkzpujkviutj.supabase.co}"
FEED_URL="$API_BASE/functions/v1/cached-feed"
IMAGE_URL="$API_BASE/functions/v1/optimize-image"
TOKEN="${SUPABASE_ANON_KEY}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "🌍 Test Performance Afrique"
echo "=================================================="
echo ""

# Test 1: Latence Feed
echo "📊 Test 1: Latence Feed (10 requêtes)"
echo "--------------------------------------------------"

TOTAL=0
HITS=0
for i in {1..10}; do
  RESPONSE=$(curl -w "\n%{time_total},%{http_code}" -o /dev/null -s \
    "$FEED_URL?page=0" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Test-Location: africa")
  
  TIME=$(echo "$RESPONSE" | tail -1 | cut -d',' -f1)
  CODE=$(echo "$RESPONSE" | tail -1 | cut -d',' -f2)
  
  TOTAL=$(echo "$TOTAL + $TIME" | bc)
  
  # Vérifier cache (simulé)
  if (( i > 2 )); then
    HITS=$((HITS + 1))
  fi
  
  echo "  Requête $i: ${TIME}s (HTTP $CODE)"
  sleep 0.5
done

AVG=$(echo "scale=3; $TOTAL / 10" | bc)
echo ""
echo "⏱️  Latence moyenne: ${AVG}s"

# Évaluation latence
if (( $(echo "$AVG < 0.6" | bc -l) )); then
  echo -e "${GREEN}✅ Objectif atteint (<600ms)${NC}"
else
  echo -e "${RED}❌ Latence trop élevée (>600ms)${NC}"
fi

echo ""

# Test 2: Cache Hit Ratio
echo "💾 Test 2: Cache Hit Ratio (20 requêtes)"
echo "--------------------------------------------------"

CACHE_HITS=0
for i in {1..20}; do
  CACHE_HEADER=$(curl -s -I "$FEED_URL?page=0" \
    -H "Authorization: Bearer $TOKEN" | grep -i "x-cache" || echo "MISS")
  
  if [[ $CACHE_HEADER == *"HIT"* ]]; then
    CACHE_HITS=$((CACHE_HITS + 1))
    echo "  Requête $i: ✅ HIT"
  else
    echo "  Requête $i: ⚠️  MISS"
  fi
  
  sleep 0.2
done

HIT_RATIO=$(echo "scale=1; ($CACHE_HITS / 20) * 100" | bc)
echo ""
echo "📈 Cache Hit Ratio: ${HIT_RATIO}%"

if (( $(echo "$HIT_RATIO > 60" | bc -l) )); then
  echo -e "${GREEN}✅ Objectif atteint (>60%)${NC}"
else
  echo -e "${YELLOW}⚠️  Ratio cache sous objectif (<60%)${NC}"
fi

echo ""

# Test 3: Optimisation Images
echo "🖼️  Test 3: Optimisation Images"
echo "--------------------------------------------------"

TEST_IMAGE="https://picsum.photos/1200/800"

echo "  Téléchargement image originale..."
TIME_ORIGINAL=$(curl -w "%{time_total}" -o /tmp/test-original.jpg -s "$TEST_IMAGE")
SIZE_ORIGINAL=$(stat -f%z /tmp/test-original.jpg 2>/dev/null || stat -c%s /tmp/test-original.jpg)

echo "  Téléchargement image optimisée..."
TIME_OPTIMIZED=$(curl -w "%{time_total}" -o /tmp/test-optimized.webp -s \
  "$IMAGE_URL?url=$(echo $TEST_IMAGE | jq -sRr @uri)&width=800&format=webp")
SIZE_OPTIMIZED=$(stat -f%z /tmp/test-optimized.webp 2>/dev/null || stat -c%s /tmp/test-optimized.webp)

REDUCTION=$(echo "scale=1; ((($SIZE_ORIGINAL - $SIZE_OPTIMIZED) / $SIZE_ORIGINAL) * 100)" | bc)

echo ""
echo "  Original:  ${SIZE_ORIGINAL} bytes (${TIME_ORIGINAL}s)"
echo "  Optimisé:  ${SIZE_OPTIMIZED} bytes (${TIME_OPTIMIZED}s)"
echo "  Réduction: ${REDUCTION}%"

if (( $(echo "$REDUCTION > 30" | bc -l) )); then
  echo -e "${GREEN}✅ Bonne optimisation (>${REDUCTION}%)${NC}"
else
  echo -e "${YELLOW}⚠️  Optimisation limitée${NC}"
fi

# Nettoyage
rm -f /tmp/test-original.jpg /tmp/test-optimized.webp

echo ""
echo "=================================================="
echo "📋 Résumé"
echo "=================================================="
echo ""
echo "✓ Latence Feed:     ${AVG}s"
echo "✓ Cache Hit Ratio:  ${HIT_RATIO}%"
echo "✓ Réduction Images: ${REDUCTION}%"
echo ""

# Verdict final
LATENCY_OK=$(echo "$AVG < 0.6" | bc -l)
CACHE_OK=$(echo "$HIT_RATIO > 60" | bc -l)
IMAGE_OK=$(echo "$REDUCTION > 30" | bc -l)

if [[ $LATENCY_OK -eq 1 && $CACHE_OK -eq 1 && $IMAGE_OK -eq 1 ]]; then
  echo -e "${GREEN}🎉 TOUS LES CRITÈRES SONT ATTEINTS!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Certains critères ne sont pas atteints${NC}"
  exit 1
fi
