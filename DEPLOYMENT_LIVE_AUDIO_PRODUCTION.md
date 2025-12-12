# 🚀 **DÉPLOIEMENT SYSTÈME LIVE AUDIO - PRODUCTION**

## 📋 **Vue d'ensemble**

Ce guide détaille le déploiement complet du système Live Audio professionnel pour la production.

## 🗄️ **1. Migration Base de Données**

### **Exécution de la migration Supabase**

```bash
# Appliquer la migration complète
supabase db push

# Vérifier que toutes les tables sont créées
supabase db inspect

# Tester les politiques RLS
supabase db test
```

### **Vérifications post-migration**

```sql
-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'live_%';

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'live_%';

-- Vérifier les indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'live_%';
```

## 🔧 **2. Configuration Environnement**

### **Variables d'environnement**

Ajouter dans `.env.production` :

```env
# Live Audio Configuration
VITE_LIVE_AUDIO_ENABLED=true
VITE_LIVE_AUDIO_MAX_PARTICIPANTS=1000
VITE_LIVE_AUDIO_WEBRTC_ICE_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
VITE_LIVE_AUDIO_TURN_SERVER_URL=your-turn-server-url
VITE_LIVE_AUDIO_TURN_USERNAME=your-turn-username
VITE_LIVE_AUDIO_TURN_PASSWORD=your-turn-password

# Redis pour la scalabilité (optionnel)
REDIS_URL=redis://localhost:6379
VITE_REDIS_ENABLED=false

# Monitoring et Analytics
VITE_LIVE_AUDIO_ANALYTICS_ENABLED=true
VITE_LIVE_AUDIO_ERROR_REPORTING=true
```

### **Configuration Supabase**

Dans `supabase/config.toml` :

```toml
[api]
enabled = true
port = 54321

[auth]
enabled = true
site_url = "https://yourdomain.com"
additional_redirect_urls = ["https://yourdomain.com"]
jwt_expiry = 3600

[realtime]
enabled = true
poll_interval_ms = 100
max_header_length = 4096

[functions]
enabled = true

[storage]
enabled = true
```

## 🏗️ **3. Fonctions Edge Supabase**

### **Création des fonctions nécessaires**

```bash
# Fonction pour rejoindre une salle
supabase functions new join-live-audio-room

# Fonction pour la signalisation WebRTC
supabase functions new webrtc-signaling

# Fonction de nettoyage automatique
supabase functions new cleanup-expired-rooms
```

### **Contenu des fonctions**

#### **`join-live-audio-room/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { roomId, userId } = await req.json()

    // Vérifier que la salle existe et n'est pas pleine
    const { data: room, error: roomError } = await supabaseClient
      .from('live_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Salle introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (room.current_participants >= room.max_participants) {
      return new Response(
        JSON.stringify({ error: 'Salle pleine' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ajouter le participant
    const { error: participantError } = await supabaseClient
      .from('live_audio_participants')
      .insert({
        room_id: roomId,
        user_id: userId,
        role: room.host_id === userId ? 'host' : 'listener'
      })

    if (participantError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'ajout du participant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, room }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

#### **`cleanup-expired-rooms/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Nettoyer les salles expirées
    const { data: expiredRooms, error: roomsError } = await supabaseClient
      .rpc('cleanup_expired_rooms')

    // Nettoyer les participants inactifs
    const { data: inactiveParticipants, error: participantsError } = await supabaseClient
      .rpc('cleanup_inactive_participants')

    return new Response(
      JSON.stringify({
        success: true,
        cleaned_rooms: expiredRooms,
        cleaned_participants: inactiveParticipants
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erreur nettoyage' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## 🚀 **4. Déploiement Application**

### **Build de production**

```bash
# Build optimisé pour la production
npm run build

# Prévisualisation du build
npm run preview

# Test des fonctionnalités critiques
npm run test:e2e
```

### **Configuration Vite pour la production**

Dans `vite.config.ts` :

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'live-audio': ['@/hooks/useLiveAudio', '@/services/liveAudioService'],
          'ui-components': ['@/components/ui/*'],
          'utils': ['@/utils/*']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'lucide-react']
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  }
})
```

## 📊 **5. Monitoring et Analytics**

### **Métriques à surveiller**

```typescript
// Configuration du monitoring
const monitoringConfig = {
  // Performances audio
  audioLatency: '< 100ms',
  packetLoss: '< 2%',
  jitter: '< 50ms',

  // Utilisation système
  cpuUsage: '< 70%',
  memoryUsage: '< 80%',
  concurrentUsers: '< 1000',

  // Qualité de service
  connectionSuccess: '> 95%',
  messageDelivery: '> 99%',
  roomJoinTime: '< 3s'
}
```

### **Logs et Alertes**

```typescript
// Configuration des logs
const loggingConfig = {
  level: 'info',
  format: 'json',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'live-audio.log' })
  ]
}

// Alertes critiques
const alerts = {
  roomJoinFailure: '> 5%',
  audioQualityDrop: '> 10%',
  highLatency: '> 500ms',
  participantDisconnect: '> 20%'
}
```

## 🔒 **6. Sécurité et Conformité**

### **Audit de sécurité**

```bash
# Scan des vulnérabilités
npm audit

# Test de charge
npm run load-test

# Audit d'accessibilité
npm run accessibility-test
```

### **Politiques de sécurité**

- **Authentification** : JWT tokens avec expiration
- **Autorisation** : RLS policies strictes
- **Chiffrement** : WebRTC DTLS + SRTP
- **Rate limiting** : Protection anti-spam
- **Input validation** : Sanitisation complète

## 🌐 **7. Configuration CDN et Cache**

### **Optimisation des assets**

```typescript
// Configuration du cache
const cacheConfig = {
  // Audio files
  beats: {
    maxAge: '1y',
    immutable: true,
    cacheControl: 'public, max-age=31536000'
  },

  // Static assets
  images: {
    maxAge: '1h',
    cacheControl: 'public, max-age=3600'
  },

  // API responses
  rooms: {
    maxAge: '30s',
    cacheControl: 'private, max-age=30'
  }
}
```

## 📈 **8. Scaling et Performance**

### **Configuration pour haute disponibilité**

```typescript
const scalingConfig = {
  // Load balancing
  instances: 3,
  autoScaling: {
    minInstances: 2,
    maxInstances: 10,
    targetCPUUsage: 70
  },

  // Database
  connectionPooling: {
    maxConnections: 100,
    idleTimeout: 30000
  },

  // Redis (optionnel)
  redisCluster: {
    enabled: true,
    nodes: 3,
    replication: true
  }
}
```

## ✅ **9. Checklist Déploiement**

### **Pré-déploiement**
- [ ] Migration base de données exécutée
- [ ] Variables d'environnement configurées
- [ ] Fonctions Edge déployées
- [ ] Build de production réussi
- [ ] Tests automatisés passés

### **Post-déploiement**
- [ ] Monitoring activé
- [ ] Logs configurés
- [ ] Alertes fonctionnelles
- [ ] Performance vérifiée
- [ ] Accessibilité validée

### **Tests de charge**
- [ ] 100 utilisateurs simultanés
- [ ] 500 utilisateurs simultanés
- [ ] 1000 utilisateurs simultanés
- [ ] Tests de montée en charge

## 🎯 **10. Métriques de Succès**

### **KPIs à atteindre**
- **Temps de connexion** : < 3 secondes
- **Qualité audio** : > 95% satisfaction
- **Taux de rétention** : > 70% après 5 min
- **Disponibilité** : > 99.9% uptime
- **Latence audio** : < 100ms moyenne

### **Monitoring continu**
- **Performance temps réel**
- **Taux d'erreur par fonctionnalité**
- **Utilisation des ressources**
- **Feedback utilisateur**

---

## 🎊 **SYSTÈME LIVE AUDIO PRODUCTION READY !**

**Le système est maintenant déployé et opérationnel pour gérer des milliers d'utilisateurs avec une qualité professionnelle ! 🌍🎤✨**
