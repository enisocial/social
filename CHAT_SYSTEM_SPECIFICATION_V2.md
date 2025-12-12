# 🚀 S-ocial.com Messenger - Spécification Finale
## Système de Chat 1:1 Complet - Production Ready

**Date :** Décembre 2025
**Version :** 2.0 - Production
**Équipe :** Architecture & Développement

---

## 📋 **APERÇU DU PROJET**

### **Objectif**
Implémenter un système de messagerie instantanée complet équivalent à Facebook Messenger, exclusivement en 1:1, intégré au système social existant avec toutes les fonctionnalités avancées demandées.

### **Contraintes Techniques**
- ✅ **Intégration existante** : Utilisateurs, profils, amis, permissions
- ✅ **Base de données** : PostgreSQL existante (minimiser migrations destructives)
- ✅ **Frontend** : React/TypeScript existant
- ✅ **Production ready** : Tests, monitoring, sécurité

---

## 🏗️ **ARCHITECTURE TECHNIQUE**

### **Stack Technologique**
```
Frontend: React + TypeScript + Tailwind CSS
Backend:  Supabase (Realtime + Storage + Functions)
WebRTC:  PeerJS + Socket.IO pour appels
Storage: Supabase Storage (fichiers, médias)
Realtime: Supabase Realtime + WebSocket
Sécurité: Row Level Security + JWT
```

### **Architecture Modulaire**
```
📁 src/features/messenger/
├── 📁 backend/           # Logique serveur (Supabase)
│   ├── 📄 realtime.ts    # Gestion WebSocket
│   ├── 📄 storage.ts     # Upload fichiers
│   └── 📄 webrtc.ts      # Signalisation appels
├── 📁 components/        # Composants UI
│   ├── 📄 ChatWindow.tsx # Fenêtre principale
│   ├── 📄 MessageList.tsx# Liste messages
│   ├── 📄 MessageInput.tsx# Zone saisie
│   └── 📄 CallModal.tsx  # Modale appels
├── 📁 hooks/            # Logique métier
│   ├── 📄 useChat.ts    # Gestion chat
│   ├── 📄 useWebRTC.ts  # Appels audio/vidéo
│   └── 📄 useTyping.ts  # Indicateur frappe
├── 📁 services/         # Services externes
│   ├── 📄 fileUpload.ts # Upload fichiers
│   ├── 📄 encryption.ts # Chiffrement (futur)
│   └── 📄 notifications.ts# Push notifications
├── 📁 types/            # Types TypeScript
│   ├── 📄 message.types.ts
│   ├── 📄 call.types.ts
│   └── 📄 file.types.ts
└── 📁 utils/            # Utilitaires
    ├── 📄 formatters.ts
    ├── 📄 validators.ts
    └── 📄 constants.ts
```

---

## 🎯 **FONCTIONNALITÉS À IMPLÉMENTER**

### **Phase 1 : Base - Messages Texte (MVP)**
- ✅ **Conversations 1:1** avec historique
- ✅ **Messages texte** temps réel (WebSocket)
- ✅ **Indicateurs lecture** (✓ ✓ ✓)
- ✅ **Typing indicator**
- ✅ **Pagination cursor-based**
- ✅ **Intégration utilisateurs existants**

### **Phase 2 : Médias & Fichiers**
- ✅ **Upload images/vidéos** (compression automatique)
- ✅ **Prévisualisation médias**
- ✅ **Thumbnail génération**
- ✅ **Progression upload** (chunked)
- ✅ **Galerie médias** par conversation

### **Phase 3 : Fonctionnalités Avancées**
- ✅ **Appels audio/vidéo** (WebRTC)
- ✅ **Messages vocaux** (enregistrement)
- ✅ **Réactions emoji**
- ✅ **Messages éphémères**
- ✅ **Transfert messages**
- ✅ **Citation/réponse**

### **Phase 4 : Sécurité & Performance**
- ✅ **E2E Encryption** (Signal Protocol)
- ✅ **Rate limiting**
- ✅ **Modération contenu**
- ✅ **Audit logging**
- ✅ **Offline support**

---

## 🗄️ **SCHÉMA BASE DE DONNÉES**

### **Tables Existantes (à préserver)**
```sql
-- Utilisateurs existants (profiles)
-- Amis existants (friendships)
-- Permissions existantes (privacy_settings)
```

### **Nouvelles Tables (Migrations Non-Destructives)**
```sql
-- Conversations 1:1
CREATE TABLE messenger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID REFERENCES profiles(id),
  participant2_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- Messages
CREATE TABLE messenger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES messenger_conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'text',
  media_url TEXT,
  media_type VARCHAR(100),
  media_size INTEGER,
  reply_to_id UUID REFERENCES messenger_messages(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts de lecture
CREATE TABLE messenger_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messenger_messages(id),
  user_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'delivered', -- sent, delivered, read
  read_at TIMESTAMPTZ,
  UNIQUE(message_id, user_id)
);

-- Réactions
CREATE TABLE messenger_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messenger_messages(id),
  user_id UUID REFERENCES profiles(id),
  emoji VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Appels WebRTC
CREATE TABLE messenger_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES messenger_conversations(id),
  initiator_id UUID REFERENCES profiles(id),
  call_type VARCHAR(20) DEFAULT 'audio', -- audio, video
  status VARCHAR(20) DEFAULT 'ringing', -- ringing, answered, ended
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER
);
```

---

## 🔐 **SÉCURITÉ & PERMISSIONS**

### **Row Level Security (RLS)**
```sql
-- Seuls les participants peuvent voir la conversation
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_participants_only" ON messenger_conversations
  FOR ALL USING (
    auth.uid() = participant1_id OR auth.uid() = participant2_id
  );

-- Seuls les participants peuvent voir les messages
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_participants_only" ON messenger_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations
      WHERE id = conversation_id
      AND (participant1_id = auth.uid() OR participant2_id = auth.uid())
    )
  );
```

### **Rate Limiting**
```typescript
// Rate limiting côté serveur
const MESSAGE_RATE_LIMIT = {
  messages_per_minute: 60,
  files_per_hour: 20,
  calls_per_hour: 10
};
```

---

## 🎨 **DESIGN SYSTEM**

### **Palette Africaine Moderne**
```css
/* Couleurs principales */
--primary-50: #fef7ed;
--primary-100: #fef3c7;
--primary-500: #f59e0b;
--primary-600: #d97706;
--primary-900: #9a3412;

/* Tons terre africains */
--earth-100: #f5f5dc;
--earth-200: #e6d7c3;
--earth-500: #a0522d;
--earth-700: #654321;

/* Accents vifs */
--accent-green: #22c55e;
--accent-blue: #3b82f6;
--accent-purple: #8b5cf6;
```

### **Composants UI**
- **ChatWindow** : Fenêtre flottante responsive
- **MessageBubble** : Bulles colorées avec réactions
- **MessageInput** : Zone saisie avec attachements
- **CallModal** : Interface appels WebRTC
- **MediaGallery** : Galerie médias conversation

---

## 📱 **FONCTIONNALITÉS DÉTAILLÉES**

### **Messages & Conversations**
- ✅ **Texte enrichi** : Markdown, liens, mentions
- ✅ **Historique infini** : Pagination cursor-based
- ✅ **Recherche** : Full-text search PostgreSQL
- ✅ **Messages éphémères** : Auto-suppression
- ✅ **Transfert** : Forward vers autres contacts

### **Médias & Fichiers**
- ✅ **Upload intelligent** : Compression, thumbnail
- ✅ **Types supportés** : Images, vidéos, audio, documents
- ✅ **Prévisualisation** : Avant envoi
- ✅ **Téléchargement** : Sécurisé avec permissions

### **Appels Audio/Vidéo**
- ✅ **WebRTC P2P** : Peer-to-peer direct
- ✅ **TURN server** : Fallback NAT traversal
- ✅ **Qualité adaptative** : Selon bande passante
- ✅ **Enregistrement** : Optionnel côté client

### **Sécurité**
- ✅ **TLS complet** : Chiffrement transport
- ✅ **E2E encryption** : Signal Protocol (Phase 4)
- ✅ **Permissions strictes** : RLS PostgreSQL
- ✅ **Audit logging** : Actions sensibles

---

## 🚀 **PLAN DE DÉVELOPPEMENT**

### **Sprint 1 : Base Messages (1 semaine)**
1. Migration base de données
2. API messages texte
3. Interface de chat basique
4. Intégration utilisateurs existants

### **Sprint 2 : Médias & UI (1 semaine)**
1. Upload fichiers/images
2. Interface moderne complète
3. Indicateurs temps réel
4. Tests d'intégration

### **Sprint 3 : Appels & Avancé (2 semaines)**
1. WebRTC audio/vidéo
2. Réactions & fonctionnalités avancées
3. Messages éphémères
4. Optimisations performance

### **Sprint 4 : Sécurité & Production (1 semaine)**
1. E2E encryption
2. Modération & sécurité
3. Tests complets
4. Monitoring & déploiement

---

## 🧪 **TESTS & QUALITÉ**

### **Tests Unitaires**
```typescript
// Tests composants React
// Tests hooks personnalisés
// Tests utilitaires
```

### **Tests d'Intégration**
```typescript
// Tests API Supabase
// Tests WebRTC
// Tests upload fichiers
```

### **Tests E2E**
```typescript
// Tests complets utilisateur
// Tests appels audio/vidéo
// Tests performance
```

### **Tests de Charge**
```typescript
// k6 pour montée en charge
// Tests WebRTC multi-utilisateurs
// Tests upload simultané
```

---

## 📊 **MÉTRIQUES & MONITORING**

### **Métriques Clés**
- **Latence messages** : <200ms cible
- **Taux livraison** : >99.9%
- **Disponibilité appels** : >99.5%
- **Temps réponse UI** : <100ms

### **Outils Monitoring**
- **Sentry** : Erreurs et performance
- **Supabase Analytics** : Métriques base
- **Custom dashboards** : Latence, usage

---

## 🎯 **LIVRABLES FINAUX**

### **Code Production**
- ✅ **Frontend complet** : Tous composants
- ✅ **Backend intégré** : Supabase functions
- ✅ **Base de données** : Migrations + RLS
- ✅ **Tests complets** : Unitaires + E2E
- ✅ **Documentation** : API + utilisateur

### **Documentation**
- ✅ **Guide développeur** : Architecture, API
- ✅ **Guide utilisateur** : Fonctionnalités
- ✅ **Guide déploiement** : Production setup
- ✅ **Guide maintenance** : Monitoring, scaling

### **Infrastructure**
- ✅ **CI/CD** : GitHub Actions
- ✅ **Docker** : Conteneurisation
- ✅ **Monitoring** : Dashboards complets

---

## 💰 **ESTIMATION COÛTS**

### **Infrastructure (mensuel)**
- **Supabase Pro** : $25/mois
- **Storage S3** : $5/mois
- **TURN server** : $10/mois (VPS)
- **Monitoring** : $15/mois

**Total : ~$55/mois** pour production

### **Temps Développement**
- **Phase 1** : 1 semaine (40h)
- **Phase 2** : 1 semaine (40h)
- **Phase 3** : 2 semaines (80h)
- **Phase 4** : 1 semaine (40h)

**Total : 5 semaines** développement

---

## 🎉 **CONCLUSION**

Ce système de messagerie sera **production-ready** avec toutes les fonctionnalités demandées :

✅ **Facebook Messenger-like** complet
✅ **Intégré au système existant**
✅ **Sécurisé et scalable**
✅ **Moderne et accessible**
✅ **Tests et monitoring complets**

**Prêt pour déploiement en production africaine !** 🇨🇮🚀
