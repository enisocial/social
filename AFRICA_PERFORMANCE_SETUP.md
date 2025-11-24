# Configuration Performance pour l'Afrique

## Vue d'ensemble
Configuration CDN et caching optimisée pour réduire la latence des utilisateurs africains.

## Architecture

### 1. CDN Configuration (Vercel)
**Régions edge configurées:**
- CDG1 (Paris) - pour Afrique du Nord/Ouest
- JNB1 (Johannesburg) - pour Afrique du Sud
- LHR1 (Londres) - fallback Europe

**Règles de cache:**
- Assets statiques: 1 an (immutable)
- Images: 1 an (immutable)
- API/Feed: 3s avec stale-while-revalidate de 10s

### 2. Edge Functions

#### `optimize-image`
Optimisation d'images à la volée:
- Génération de thumbnails
- Conversion WebP/AVIF
- Redimensionnement dynamique
- Cache CDN 1 an

**Usage:**
```typescript
const optimizedUrl = `${SUPABASE_URL}/functions/v1/optimize-image?url=${encodeURIComponent(imageUrl)}&width=400&format=webp`;
```

#### `cached-feed`
Cache de feed avec TTL 3s:
- Cache en mémoire par utilisateur
- Invalidation automatique
- Headers X-Cache pour monitoring
- Réduction latence base de données

**Usage:**
```typescript
const { data } = await supabase.functions.invoke('cached-feed', {
  body: { page: 0 }
});
```

### 3. Optimisations Images Frontend

Le composant `OptimizedImage` supporte:
- Lazy loading natif
- Placeholder blur
- Formats modernes (WebP/AVIF)
- Srcset responsive
- Chargement progressif

## Tests de Latence

### Locations de Test
1. **Johannesburg, Afrique du Sud** (JNB1)
2. **Lagos, Nigeria**
3. **Abidjan, Côte d'Ivoire**

### Méthodologie

#### Test 1: Latence Feed
```bash
# Depuis chaque location
curl -w "@curl-format.txt" -o /dev/null -s \
  "${SUPABASE_URL}/functions/v1/cached-feed?page=0" \
  -H "Authorization: Bearer ${TOKEN}"
```

Créer `curl-format.txt`:
```
time_namelookup:    %{time_namelookup}s\n
time_connect:       %{time_connect}s\n
time_appconnect:    %{time_appconnect}s\n
time_pretransfer:   %{time_pretransfer}s\n
time_redirect:      %{time_redirect}s\n
time_starttransfer: %{time_starttransfer}s\n
time_total:         %{time_total}s\n
```

#### Test 2: Cache Hit Ratio
```bash
# 100 requêtes successives
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code},%{header_json}\n" \
    "${SUPABASE_URL}/functions/v1/cached-feed?page=0" \
    -H "Authorization: Bearer ${TOKEN}"
done | grep "X-Cache"
```

#### Test 3: Optimisation Images
```bash
# Comparer image originale vs optimisée
time curl -o original.jpg "${IMAGE_URL}"
time curl -o optimized.webp \
  "${SUPABASE_URL}/functions/v1/optimize-image?url=${IMAGE_URL}&width=400&format=webp"

# Comparer tailles
ls -lh original.jpg optimized.webp
```

### Script de Test Automatisé

```bash
#!/bin/bash
# test-africa-performance.sh

LOCATIONS=("johannesburg" "lagos" "abidjan")
API_URL="${SUPABASE_URL}/functions/v1/cached-feed"
TOKEN="${SUPABASE_ANON_KEY}"

echo "Testing from African locations..."
for loc in "${LOCATIONS[@]}"; do
  echo "Location: $loc"
  
  # Test via VPN/proxy ou service de test géodistribué
  # Exemple avec speedtest-cli ou service tiers
  
  # Mesurer latence
  LATENCY=$(curl -w "%{time_total}" -o /dev/null -s \
    "$API_URL?page=0" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Latency: ${LATENCY}s"
  
  # Test cache hit
  CACHE_STATUS=$(curl -s -I "$API_URL?page=0" \
    -H "Authorization: Bearer $TOKEN" | grep "X-Cache")
  
  echo "Cache: $CACHE_STATUS"
  echo "---"
done
```

## Critères d'Acceptation

### 1. Réduction Latence ≥ 30%

**Baseline (sans optimisation):**
- Johannesburg: ~800ms
- Lagos: ~1200ms
- Abidjan: ~1500ms

**Target (avec optimisation):**
- Johannesburg: ≤560ms (-30%)
- Lagos: ≤840ms (-30%)
- Abidjan: ≤1050ms (-30%)

**Mesure:**
```bash
# Avant optimisation
BASELINE=$(curl -w "%{time_total}" -o /dev/null -s "$API_URL")

# Après optimisation
OPTIMIZED=$(curl -w "%{time_total}" -o /dev/null -s "$API_URL")

# Calcul réduction
echo "scale=2; (($BASELINE - $OPTIMIZED) / $BASELINE) * 100" | bc
# Doit être ≥ 30
```

### 2. Cache Hit Ratio > 60%

**Sur 100 requêtes successives:**
```bash
HITS=$(for i in {1..100}; do
  curl -s -I "$API_URL?page=0" -H "Authorization: Bearer $TOKEN" | grep "X-Cache: HIT"
done | wc -l)

RATIO=$(echo "scale=2; ($HITS / 100) * 100" | bc)
echo "Cache Hit Ratio: ${RATIO}%"
# Doit être > 60%
```

## Monitoring Production

### Métriques à Surveiller
1. **Latence moyenne par région**
2. **Cache hit ratio**
3. **Taille images servies**
4. **Erreurs edge functions**

### Dashboard Recommendations
- Vercel Analytics: latence par région
- Logs edge functions: cache stats
- CDN metrics: bandwidth, cache hit ratio

## Optimisations Futures

1. **Image CDN externe** (Cloudflare Images, ImageKit)
2. **Service Worker** pour cache client
3. **Preload/Prefetch** stratégique
4. **HTTP/3** pour réduction latence
5. **Edge compute** pour ranking feed côté edge

## Ressources

- [Vercel Edge Network](https://vercel.com/docs/edge-network/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web.dev Performance](https://web.dev/performance/)
