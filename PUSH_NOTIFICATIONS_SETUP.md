# Configuration des Notifications Push avec WonderPush

Ce guide vous aide à configurer les notifications push avec WonderPush pour votre application.

## Étape 1 : Créer un compte WonderPush

1. Rendez-vous sur [WonderPush](https://www.wonderpush.com/)
2. Créez un compte gratuit
3. Créez une nouvelle application

## Étape 2 : Récupérer les clés API

Dans votre dashboard WonderPush :

1. Allez dans **Settings** → **Keys**
2. Copiez les clés suivantes :
   - **Web Key** (clé publique)
   - **Client ID** (pour l'API)
   - **Client Secret** (pour l'API)

## Étape 3 : Configurer les secrets dans Lovable

1. Allez dans **Settings** → **Secrets**
2. Ajoutez les secrets suivants :
   - `VITE_WONDERPUSH_WEB_KEY` : Votre Web Key
   - `WONDERPUSH_CLIENT_ID` : Votre Client ID
   - `WONDERPUSH_CLIENT_SECRET` : Votre Client Secret

## Étape 3 : Tester les notifications

1. **Autoriser les notifications** dans votre navigateur
2. **S'inscrire aux notifications** via le prompt ou les paramètres
3. **Tester** en effectuant des actions (like, commentaire, message)

### Test manuel via la console du navigateur

```javascript
// Vérifier l'inscription
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log('Subscription:', subscription);

// Tester une notification locale
registration.showNotification('Test', {
  body: 'Ceci est un test',
  icon: '/icon-192.png'
});
```

## Étape 4 : Vérifier le fonctionnement

### Vérifier l'edge function

```bash
# Dans la console Lovable Cloud
# Allez dans Cloud → Edge Functions → send-push-notification
# Vérifiez les logs
```

### Vérifier la base de données

```sql
-- Voir les inscriptions aux notifications
SELECT * FROM push_subscriptions;
```

## Fonctionnalités implémentées

✅ **Notifications pour :**
- Nouveaux messages
- Nouveaux likes
- Nouveaux commentaires
- Demandes d'ami
- Commandes marketplace

✅ **Fonctionnalités :**
- Prompt d'inscription automatique
- Page de paramètres dédiée
- Notifications en temps réel
- Support PWA complet

## Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que les clés VAPID sont correctement configurées
2. Vérifiez les permissions du navigateur
3. Consultez les logs de l'edge function
4. Testez dans un navigateur compatible (Chrome, Firefox, Safari)

### L'inscription échoue

1. Vérifiez que le service worker est enregistré : `navigator.serviceWorker.ready`
2. Vérifiez la console pour les erreurs
3. Assurez-vous que l'application est servie en HTTPS (ou localhost)

### Les notifications arrivent en retard

1. Les notifications push peuvent avoir un délai selon le réseau
2. Vérifiez que l'appareil n'est pas en mode économie d'énergie
3. Consultez les logs de l'edge function pour voir le temps de traitement

## Navigateurs supportés

- ✅ Chrome Desktop & Mobile
- ✅ Firefox Desktop & Mobile
- ✅ Safari Desktop & Mobile (iOS 16.4+)
- ✅ Edge
- ❌ Internet Explorer

## Ressources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Keys](https://vapidkeys.com/)
