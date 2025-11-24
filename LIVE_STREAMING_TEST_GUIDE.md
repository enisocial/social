# 🧪 Guide de Test - Système de Live Streaming

## 📋 Pré-requis

### Matériel
- ✅ Caméra fonctionnelle (webcam ou mobile)
- ✅ Microphone fonctionnel
- ✅ Connexion internet stable (min. 1 Mbps upload pour broadcaster)

### Navigateurs Recommandés
- ✅ Chrome/Edge 90+ (meilleur support WebRTC)
- ✅ Firefox 88+
- ✅ Safari 14+ (iOS/MacOS)
- ❌ Internet Explorer (non supporté)

### Permissions Requises
- 🎥 Accès caméra
- 🎤 Accès microphone
- 🔊 Lecture audio automatique

---

## 🧪 Scénario de Test #1 : Broadcaster Seul

### Étapes
1. **Créer un live**
   - Cliquer sur "Démarrer un live"
   - Autoriser l'accès à la caméra et au micro
   - Attendre l'initialisation (5-10 secondes)

2. **Vérifier l'affichage**
   - ✅ Votre vidéo apparaît immédiatement
   - ✅ Badge "LIVE" rouge clignote
   - ✅ Compteur de viewers = 0
   - ✅ Durée du live s'incrémente

3. **Tester les contrôles**
   - Toggle audio ON/OFF → Vérifier l'icône
   - Toggle vidéo ON/OFF → Écran noir/retour vidéo
   - Switch caméra → Change avant/arrière (mobile)

4. **Terminer le live**
   - Cliquer sur "Terminer"
   - Les statistiques doivent s'afficher
   - Vérifier : durée, likes, messages

### ✅ Résultats Attendus
- Vidéo fluide 30fps
- Latence < 500ms (vidéo synchronisée avec audio)
- Aucun freeze ou déconnexion
- Tous les contrôles fonctionnent

---

## 🧪 Scénario de Test #2 : Broadcaster + 1 Viewer

### Étapes

#### Broadcaster (Appareil A)
1. Démarrer un live
2. Attendre la connexion
3. Noter l'URL du live

#### Viewer (Appareil B)
1. Ouvrir l'URL du live
2. **Vérifier immédiatement**
   - ✅ La vidéo du broadcaster apparaît (PAS d'écran noir)
   - ✅ Audio synchronisé
   - ✅ Compteur viewers = 1 (côté broadcaster)

3. **Tester le chat**
   - Envoyer un message
   - Vérifier qu'il apparaît des deux côtés en temps réel

4. **Tester les réactions**
   - Cliquer sur ❤️, 👍, 😊, ✨
   - Vérifier l'animation fluide
   - Compteur de likes augmente

5. **Envoyer un cadeau** (viewer uniquement)
   - Ouvrir le panel cadeaux
   - Sélectionner un cadeau
   - Animation élaborée doit apparaître

### ✅ Résultats Attendus
- Vidéo visible immédiatement (< 3 secondes)
- Chat synchronisé (latence < 1 seconde)
- Réactions fluides et animées
- Compteur précis des viewers

---

## 🧪 Scénario de Test #3 : Multi-Viewers (5-10)

### Configuration
- 1 broadcaster
- 5 viewers simultanés (appareils différents ou onglets incognito)

### Étapes
1. Broadcaster démarre le live
2. Ajouter les viewers un par un
3. À chaque nouveau viewer, vérifier :
   - ✅ Il voit la vidéo instantanément
   - ✅ Le compteur s'incrémente correctement
   - ✅ Le chat fonctionne pour tous

4. Tous les viewers envoient des messages simultanément
5. Vérifier que tous les messages apparaissent dans l'ordre

### ✅ Résultats Attendus
- 5-10 viewers peuvent regarder simultanément
- Pas de dégradation de qualité vidéo
- Chat fluide pour tous
- Compteur précis

### ⚠️ Notes
- Au-delà de 10 viewers, la qualité peut diminuer
- Dépend de la connexion du broadcaster
- Si problèmes : activer un serveur TURN

---

## 🧪 Scénario de Test #4 : Connexion Instable

### Simulation
- Broadcaster sur connexion 3G/4G
- Changer de réseau pendant le live

### Étapes
1. Démarrer un live
2. Désactiver WiFi → passer en mobile
3. Attendre 5-10 secondes

### ✅ Résultats Attendus
- Reconnexion automatique
- Message de reconnexion affiché
- Pas de crash de l'application
- Le live continue sans interruption

---

## 🐛 Problèmes Connus & Solutions

### 🚨 Écran Noir Viewer

**Symptômes** : Le viewer ne voit que l'écran noir

**Causes Possibles** :
1. ❌ Broadcaster n'a pas autorisé la caméra
2. ❌ Problème de signaling (vérifier les logs)
3. ❌ Firewall bloque WebRTC

**Solutions** :
```
1. Broadcaster : Vérifier permissions caméra dans navigateur
2. Viewer : Rafraîchir la page (F5)
3. Les deux : Vérifier console (F12) pour erreurs
4. Si persiste : Utiliser un serveur TURN
```

### 🚨 Chat Ne Fonctionne Pas

**Symptômes** : Messages n'apparaissent pas

**Cause** : Problème de Supabase Realtime

**Solution** :
```
1. Vérifier connexion internet
2. Vérifier console pour erreurs Supabase
3. Rafraîchir la page
4. Vérifier RLS policies dans Supabase
```

### 🚨 Compteur de Viewers Incorrect

**Symptômes** : Compteur = 0 alors qu'il y a des viewers

**Cause** : Presence tracking pas initialisé

**Solution** :
```
1. Attendre 5-10 secondes (délai normal)
2. Viewer : Rafraîchir la page
3. Vérifier logs Supabase Realtime
```

### 🚨 Latence Élevée (> 3s)

**Symptômes** : Vidéo très décalée

**Causes** :
1. Connexion lente
2. Trop de viewers
3. Pas de serveur TURN

**Solutions** :
```
1. Réduire nombre de viewers simultanés
2. Utiliser une meilleure connexion
3. Implémenter un serveur TURN (production)
```

---

## 📊 Métriques de Performance

### Console Logs Attendus

#### Broadcaster
```
🎬 [LIVE] Initializing stream...
📹 [BROADCASTER] Starting camera access...
✅ [BROADCASTER] Camera access granted
▶️ [BROADCASTER] Video playing
✅ [HOOK] WebRTC fully initialized
👥 [HOOK] Viewers count: 1
```

#### Viewer
```
🎬 [LIVE] Initializing stream...
👀 [VIEWER] Initializing...
📹 [VIEWER] Received remote track: video
✅ [VIEWER] Remote stream attached
▶️ [VIEWER] Video playing
✅ [HOOK] WebRTC fully initialized
```

### ⚠️ Logs d'Erreur à Surveiller
```
❌ [BROADCASTER] Initialization failed
❌ [VIEWER] Error adding ICE candidate
❌ Data channel error
🔗 Connection state: failed
```

---

## 🎯 Checklist Finale

### Fonctionnalités de Base
- [ ] Broadcaster peut démarrer un live
- [ ] Viewer voit la vidéo instantanément
- [ ] Chat en temps réel fonctionne
- [ ] Compteur de viewers est précis
- [ ] Réactions/likes s'affichent
- [ ] Cadeaux virtuels fonctionnent

### Contrôles Broadcaster
- [ ] Toggle audio ON/OFF
- [ ] Toggle vidéo ON/OFF
- [ ] Switch caméra (mobile)
- [ ] Terminer le live
- [ ] Voir les statistiques

### Performance
- [ ] Latence vidéo < 500ms
- [ ] Chat latence < 1s
- [ ] 5+ viewers simultanés
- [ ] Pas de freeze/crash

### UX
- [ ] Loading states clairs
- [ ] Messages d'erreur informatifs
- [ ] Bouton retry fonctionne
- [ ] Animations fluides

---

## 📞 Support & Debugging

### Activer les Logs Détaillés
```javascript
// Dans la console du navigateur (F12)
localStorage.setItem('debug', 'webrtc:*,live:*');
location.reload();
```

### Vérifier WebRTC Stats
```javascript
// Dans la console
const pc = document.querySelector('video').srcObject?.getTracks()[0];
console.log(pc.getStats());
```

### Tester la Connexion WebRTC
1. Aller sur https://test.webrtc.org/
2. Vérifier connectivité UDP
3. Tester caméra/micro

---

## ✅ Validation Finale

Le système de live streaming est considéré **fonctionnel** si :

1. ✅ Vidéo broadcaster → viewer en < 3 secondes
2. ✅ 5+ viewers simultanés sans dégradation
3. ✅ Chat synchronisé avec latence < 1s
4. ✅ Toutes les réactions/cadeaux fonctionnent
5. ✅ Aucun crash sur 10+ minutes de live
6. ✅ Reconnexion automatique en cas de coupure

**Si tous les critères sont validés, le système est prêt pour la production ! 🚀**
