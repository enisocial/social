# 🔐 CHECKLIST DE SÉCURITÉ PRODUCTION

## ✅ Sécurité Base de données

### Implémenté
- [x] RLS activé sur toutes les tables
- [x] Policies restrictives par utilisateur
- [x] Rate limiting DB (100 req/min/user)
- [x] Contraintes de longueur (posts: 10k, messages: 5k, comments: 2k)
- [x] Fonction sanitize_text() anti-XSS
- [x] Indexes de sécurité

### À faire manuellement dans Cloud Backend
1. **Protection mots de passe fuités**
   - Aller dans Backend → Authentication → Password Settings
   - Activer "Leaked Password Protection"
   - Minimum password strength: "Strong"

2. **Corriger search_path des fonctions**
   ```sql
   -- Identifier les fonctions sans search_path
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public';
   
   -- Ajouter pour chaque fonction identifiée:
   ALTER FUNCTION function_name() SET search_path = public;
   ```

3. **Déplacer extensions**
   ```sql
   -- Voir quelles extensions sont en public
   SELECT extname FROM pg_extension 
   WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   
   -- Les déplacer
   ALTER EXTENSION pg_trgm SET SCHEMA extensions;
   ```

---

## 🛡️ Validation des inputs

### À implémenter dans TOUS les formulaires

```typescript
import { z } from 'zod';

// Posts
const postSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Le contenu ne peut pas être vide")
    .max(10000, "Max 10,000 caractères"),
  media_url: z.string().url().optional(),
  privacy: z.enum(['public', 'friends', 'private']),
});

// Messages
const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Le message ne peut pas être vide")
    .max(5000, "Max 5,000 caractères"),
});

// Comments
const commentSchema = z.object({
  text: z.string()
    .trim()
    .min(1, "Le commentaire ne peut pas être vide")
    .max(2000, "Max 2,000 caractères"),
});

// Profiles
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z.string()
    .trim()
    .regex(/^[a-z0-9_]{3,30}$/, "Username: 3-30 caractères alphanumériques"),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
});
```

### Implémenter dans les composants
```typescript
// Exemple: CreatePost
const onSubmit = async (data: any) => {
  try {
    const validated = postSchema.parse(data);
    // Continuer avec validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      toast.error(error.errors[0].message);
      return;
    }
  }
};
```

---

## 🚨 Rate Limiting

### Backend (Edge Functions)
À ajouter dans **TOUS** les edge functions qui modifient des données:

```typescript
// 1. create-post, edit-post
const allowed = await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_endpoint: 'posts',
  p_max_requests: 10 // 10 posts par minute
});

// 2. send-message
const allowed = await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_endpoint: 'messages',
  p_max_requests: 30 // 30 messages par minute
});

// 3. create-comment
const allowed = await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_endpoint: 'comments',
  p_max_requests: 20 // 20 comments par minute
});

// 4. like-post
const allowed = await supabase.rpc('check_rate_limit', {
  p_user_id: user.id,
  p_endpoint: 'likes',
  p_max_requests: 50 // 50 likes par minute
});

// Response si dépassé
if (!allowed) {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: 60
    }),
    { 
      status: 429,
      headers: { 
        ...corsHeaders, 
        'Retry-After': '60',
        'X-RateLimit-Limit': p_max_requests.toString(),
      }
    }
  );
}
```

### Frontend (Déjà implémenté ✅)
Le fichier `rate-limit.utils.ts` est déjà en place avec limites client-side.

---

## 🔒 Authentification & Autorisation

### Vérifié ✅
- [x] JWT tokens avec expiration
- [x] Refresh tokens automatiques
- [x] Sessions persistantes (localStorage)
- [x] Auto-confirm email activé

### À renforcer
```typescript
// 1. Middleware auth pour routes protégées
// Déjà implémenté: ProtectedRoute, UserProtectedRoute, AdminProtectedRoute ✅

// 2. Vérification permissions granulaires
const canEditPost = (post: Post, userId: string) => {
  return post.user_id === userId || isAdmin(userId);
};

// 3. Audit logs pour actions admin (déjà implémenté ✅)
```

---

## 🌐 CORS & CSP

### CORS (Déjà configuré ✅)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### CSP à ajouter
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://tohgxyzfrkzpujkviutj.supabase.co;
  media-src 'self' https://tohgxyzfrkzpujkviutj.supabase.co;
  connect-src 'self' https://tohgxyzfrkzpujkviutj.supabase.co wss://tohgxyzfrkzpujkviutj.supabase.co;
  font-src 'self' data:;
  frame-ancestors 'none';
">
```

---

## 🔍 Tests de sécurité

### Automated (À faire)
```bash
# 1. OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://votre-app.lovableproject.com

# 2. SQL Injection tests
sqlmap -u "https://votre-app.lovableproject.com/api/posts" \
  --cookie="session=..." --level=3

# 3. XSS tests
# Tester avec payloads XSS dans tous les champs texte

# 4. CSRF tests
# Tester soumissions sans tokens CSRF
```

### Manual
- [ ] Tenter accès non autorisé aux profils privés
- [ ] Tester modification posts/messages d'autres users
- [ ] Vérifier RLS sur toutes les tables
- [ ] Tester bypass rate limits
- [ ] Injection SQL via search/inputs
- [ ] XSS via contenus riches

---

## 📝 Logs & Audit

### Événements à logger
```typescript
// Déjà implémenté pour admins ✅
- Actions admin (ban, delete, moderate)
- Tentatives d'accès non autorisé
- Rate limit exceeded
- Erreurs critiques
- Changements de configuration

// À ajouter
- Connexions suspectes (IP, user agent)
- Uploads de fichiers
- Exports de données
```

### Retention
```sql
-- Cleanup logs après 90 jours
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM admin_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
```

---

## 🎯 CHECKLIST FINALE AVANT PRODUCTION

### Must-have (Bloquant)
- [ ] ✅ Tous les warnings du linter corrigés
- [ ] ✅ Rate limiting actif sur edge functions
- [ ] ✅ Validation inputs partout (zod)
- [ ] ✅ CDN configuré
- [ ] ✅ Monitoring actif (Sentry)
- [ ] ✅ Tests de charge réussis
- [ ] ✅ Backup automatique configuré

### Should-have (Fortement recommandé)
- [ ] Redis cache distribué
- [ ] Read replicas DB
- [ ] Service Worker optimisé
- [ ] Alertes configurées
- [ ] Documentation opérationnelle

### Nice-to-have
- [ ] Dashboard admin temps réel
- [ ] Analytics avancées
- [ ] A/B testing platform
- [ ] Feature flags system

---

**STATUS ACTUEL**: ⚠️ 40% prêt pour production massive

**TEMPS ESTIMÉ**: 2-3 semaines de travail pour 100% ready

**RISQUE ACTUEL**: 🔴 ÉLEVÉ sans optimisations supplémentaires
