
// CACHE PERSISTANT ULTRA-RAPIDE
export const PERSISTENT_CACHE_CONFIG = {
  // Cache de 10 minutes pour éviter TOUTES les requêtes répétées
  FEED_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  MESSAGES_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MEDIA_CACHE_TTL: 30 * 60 * 1000, // 30 minutes

  // Préchargement agressif
  PREFETCH_DISTANCE: 500, // pixels
  MAX_CONCURRENT_LOADS: 3,

  // Intersection observer ultra-sensible
  INTERSECTION_THRESHOLD: 0.001, // Déclenchement instantané
  INTERSECTION_ROOT_MARGIN: '5px', // Marge minimale

  // Cache keys optimisées
  CACHE_KEYS: {
    feed: (userId, filter, page) => `ultra-fast-feed-${userId}-${filter}-${page}`,
    messages: (conversationId) => `ultra-fast-messages-${conversationId}`,
    media: (url) => `ultra-media-${btoa(url).substring(0, 20)}`
  }
};

// Forcer le cache global
if (typeof window !== 'undefined') {
  // Désactiver complètement le cache du navigateur pour forcer nos optimisations
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
  });
}
