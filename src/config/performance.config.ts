
// CONFIGURATION PERFORMANCE ULTRA-MAXIMALE
export const PERFORMANCE_CONFIG = {
  // Cache ultra-agressif
  CACHE_STRATEGY: 'ultra-aggressive',

  // Intersection Observer
  INTERSECTION_CONFIG: {
    threshold: 0.001, // Ultra-sensible
    rootMargin: '5px 5px 300px 5px', // Préchargement large
  },

  // React Query
  REACT_QUERY_CONFIG: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes en mémoire
    refetchOnWindowFocus: false,
    retry: 1,
  },

  // Lazy loading
  LAZY_LOADING: {
    enabled: true,
    preloadDistance: 500,
    maxConcurrentLoads: 5,
  },

  // Media optimization
  MEDIA_CONFIG: {
    quality: 'high',
    format: 'webp',
    preload: true,
    cache: true,
  }
};

export default PERFORMANCE_CONFIG;
