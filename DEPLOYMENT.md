# Déploiement sur Vercel

## Configuration requise

### 1. Variables d'environnement Vercel

**IMPORTANT** : Vous devez ajouter ces variables manuellement dans l'interface Vercel.

1. Allez sur [vercel.com](https://vercel.com) → votre projet
2. Settings → Environment Variables
3. Ajoutez ces deux variables pour **tous les environnements** (Production, Preview, Development) :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://tohgxyzfrkzpujkviutj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaGd4eXpmcmt6cHVqa3ZpdXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzcyMTUsImV4cCI6MjA3OTAxMzIxNX0.P-hfFLSNjXJaPRP338NBY7nn53JoCYiaZ_LG50xWs0Q` |

### 2. Déploiement automatique

Le déploiement se déclenche automatiquement à chaque push sur la branche `main` de GitHub.

**Si les déploiements automatiques ne fonctionnent pas :**

1. Allez sur [vercel.com](https://vercel.com) → votre projet
2. Settings → Git → vérifiez que "Production Branch" est bien configuré
3. Settings → Git → assurez-vous que "Auto-deploy" est activé

### 3. Edge Functions Supabase

⚠️ **Important** : Les Edge Functions Supabase ne s'exécutent PAS sur Vercel.

Les fonctions suivantes sont déployées sur Supabase et fonctionneront via leur URL Supabase :
- `ai-recommendations`
- `increment-stats`
- `moderate-chat`
- `process-notifications`
- `send-push-notification`

Ces fonctions sont appelées via l'URL Supabase et continueront de fonctionner normalement.

### 4. Test du déploiement

Pour vérifier que tout fonctionne :

1. **Frontend** : Visitez votre URL Vercel
2. **Backend** : Les fonctions Supabase restent accessibles via :
   - `https://tohgxyzfrkzpujkviutj.supabase.co/functions/v1/[nom-fonction]`

### 5. Debugging des problèmes de déploiement

Si le déploiement échoue :

1. Vérifiez les logs Vercel (Deployments → votre déploiement → View Function Logs)
2. Assurez-vous que toutes les variables d'environnement sont définies
3. Vérifiez que `package.json` contient toutes les dépendances

### 6. Forcer un nouveau déploiement

Pour forcer un redéploiement :
- Faites un commit vide : `git commit --allow-empty -m "Force redeploy"`
- Poussez vers GitHub : `git push`

Ou directement depuis Vercel :
- Deployments → ⋯ (trois points) → Redeploy

## Architecture

```
┌─────────────────┐
│  Vercel (Frontend)  │
│  - React App         │
│  - Static Assets     │
└──────┬──────────┘
       │
       │ API Calls
       ▼
┌─────────────────────┐
│  Supabase (Backend)     │
│  - Database             │
│  - Auth                 │
│  - Edge Functions       │
│  - Storage              │
└─────────────────────┘
```

Le frontend sur Vercel communique avec le backend Supabase via les API Supabase.
