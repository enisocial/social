#!/bin/bash

# 🚀 Script de Déploiement Production - Social App
# Version: 1.0.0
# Date: Décembre 2025

set -e  # Arrêt en cas d'erreur

echo "🚀 Début du déploiement en production..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Vérifications pré-déploiement
log "🔍 Vérifications pré-déploiement..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    error "npm n'est pas installé"
fi

# Vérifier les variables d'environnement
if [ ! -f ".env" ]; then
    error "Fichier .env manquant. Copiez .env.example vers .env et configurez les variables"
fi

# Vérifier les variables essentielles
if ! grep -q "VITE_SUPABASE_URL" .env; then
    error "VITE_SUPABASE_URL manquant dans .env"
fi

if ! grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" .env; then
    error "VITE_SUPABASE_PUBLISHABLE_KEY manquant dans .env"
fi

log "✅ Variables d'environnement vérifiées"

# Installation des dépendances
log "📦 Installation des dépendances..."
npm ci

# Audit sécurité
log "🔒 Audit sécurité des dépendances..."
npm audit --audit-level moderate || warn "Vulnérabilités détectées - vérifiez le rapport"

# Build production
log "🔨 Build production..."
npm run build

if [ $? -ne 0 ]; then
    error "Build échoué"
fi

log "✅ Build réussi"

# Test du build (optionnel)
if command -v serve &> /dev/null; then
    log "🧪 Test du build local..."
    timeout 10s npm run preview > /dev/null 2>&1 &
    sleep 5
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4173 | grep -q "200"; then
        log "✅ Build testé avec succès"
    else
        warn "⚠️ Impossible de tester le build localement"
    fi
    pkill -f "vite preview" || true
fi

# Déploiement Supabase (Edge Functions)
log "☁️ Déploiement des Edge Functions..."
if command -v supabase &> /dev/null; then
    supabase functions deploy --no-verify-jwt=false
    log "✅ Edge Functions déployées"
else
    warn "⚠️ Supabase CLI non installé - déployez manuellement les Edge Functions"
fi

# Instructions finales
log "🎉 Déploiement terminé avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Vérifiez que le site fonctionne : https://your-domain.com"
echo "2. Testez l'authentification utilisateur"
echo "3. Vérifiez les Edge Functions"
echo "4. Configurez le monitoring (Sentry, Vercel Analytics)"
echo "5. Configurez les backups automatiques"
echo ""
echo "📞 Contacts en cas de problème :"
echo "- Équipe dev : contact@company.com"
echo "- Support Supabase : support@supabase.com"

exit 0
