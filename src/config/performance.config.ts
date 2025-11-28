
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
  },

  // Mobile-specific optimizations
  MOBILE_CONFIG: {
    // Reduced image quality for mobile to save bandwidth
    mobileImageQuality: 'medium',
    // Shorter cache times on mobile due to limited storage
    mobileCacheTime: 10 * 60 * 1000, // 10 minutes
    // Fewer concurrent loads on mobile
    mobileMaxConcurrentLoads: 3,
    // Smaller preload distance on mobile
    mobilePreloadDistance: 300,
    // Touch-friendly interactions
    touchTargets: {
      minSize: 44, // Minimum 44px touch targets
      spacing: 8,  // Minimum 8px spacing
    },
    // Pull-to-refresh settings
    pullToRefresh: {
      threshold: 50, // pixels to trigger refresh
      maxDistance: 80, // max pull distance
      damping: 0.5, // damping factor
    },
    // Virtual scrolling optimizations
    virtualScroll: {
      overscan: 2, // fewer items for mobile performance
      estimateSizeBuffer: 50, // smaller buffer
    },
  }
};

export default PERFORMANCE_CONFIG;
