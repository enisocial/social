import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Play, Pause, Volume2, VolumeX, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedMediaWithCacheProps {
  src: string;
  alt?: string;
  type: 'image' | 'video';
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  className?: string;
  priority?: boolean;
  quality?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

// Hook pour gérer l'intersection observer (lazy loading) - ultra optimisé
const useIntersectionObserver = (ref: React.RefObject<Element>, options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Observer principal pour intersection exacte - ULTRA RAPIDE
    const mainObserver = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.05, // Seuil plus élevé pour déclenchement plus précoce
        rootMargin: '50px', // Marge plus large pour anticipation
        ...options,
      }
    );

    // Observer secondaire pour préchargement - ZONE ULTRA ÉTENDUE
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '600px', // Zone de préchargement MASSIVE pour anticipation maximale
        ...options,
      }
    );

    mainObserver.observe(element);
    preloadObserver.observe(element);

    return () => {
      mainObserver.unobserve(element);
      preloadObserver.unobserve(element);
    };
  }, [ref, options]);

  return { isIntersecting, isNearViewport };
};

// Composant pour les images ultra-optimisées avec Redis cache
const OptimizedImageWithCache = memo(({
  src,
  alt = '',
  aspectRatio = 'auto',
  className,
  priority = false,
  quality = 'medium',
  onLoad,
  onError,
  onClick
}: Omit<OptimizedMediaWithCacheProps, 'type'>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isIntersecting: isVisible, isNearViewport } = useIntersectionObserver(containerRef, { threshold: 0.01 });

  // VÉRIFICATION: S'assurer que l'URL est valide avant tout traitement
  const isValidUrl = src && typeof src === 'string' && src.trim() !== '';
  const displayUrl = isValidUrl ? src : '';

  // ULTRA AGGRESSIVE LOADING: Priorité maximale
  const shouldLoadImmediately = priority || isVisible || isNearViewport;

  console.log('🚀 ULTRA FAST IMAGE LOAD:', {
    src: displayUrl.substring(0, 50) + '...',
    priority,
    isVisible,
    isNearViewport,
    shouldLoadImmediately
  });

  // CHARGEMENT ULTRA-RAPIDE: Commencer immédiatement dès qu'on détecte une possibilité
  useEffect(() => {
    if (shouldLoadImmediately && displayUrl) {
      setIsLoading(true);
      console.log('⚡ STARTING ULTRA FAST LOAD for priority media');
    }
  }, [shouldLoadImmediately, displayUrl]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: ''
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onClick={onClick}
    >


      {/* Skeleton de chargement */}
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Image d'erreur */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Image non disponible</p>
          </div>
        </div>
      )}

      {/* Image principale - avec Redis cache */}
      {(priority || isVisible) && !hasError && displayUrl && (
        <img
          ref={imgRef}
          src={displayUrl}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            imageRendering: quality === 'high' ? 'auto' : 'crisp-edges'
          }}
        />
      )}

      {/* Placeholder pour lazy loading */}
      {!isVisible && !priority && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}
    </div>
  );
});

// Composant pour les vidéos ultra-optimisées avec Redis cache
const OptimizedVideoWithCache = memo(({
  src,
  aspectRatio = 'video',
  className,
  priority = false,
  onLoad,
  onError,
  onClick,
  showControls = true,
  autoPlay = false,
  muted = true,
  loop = false
}: Omit<OptimizedMediaWithCacheProps, 'alt' | 'type' | 'quality'>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UTILISER EXACTEMENT LA MÊME LOGIQUE QUE LES IMAGES - ULTRA SENSIBLE
  const { isIntersecting: isVisible, isNearViewport } = useIntersectionObserver(containerRef, { threshold: 0.01 });

  // VÉRIFICATION: URL valide pour la vidéo
  const isValidUrl = src && typeof src === 'string' && src.trim() !== '';
  const videoUrl = isValidUrl ? src : '';

  // ULTRA AGGRESSIVE LOADING: Priorité maximale - MÊME LOGIQUE QUE LES IMAGES
  const shouldLoadImmediately = priority || isVisible || isNearViewport;

  console.log('🎥 ULTRA FAST VIDEO LOAD:', {
    src: videoUrl.substring(0, 50) + '...',
    priority,
    isVisible,
    isNearViewport,
    shouldLoadImmediately
  });

  // GESTION SPÉCIALE MOBILE - Force le chargement même sans intersection
  const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;

  // CACHE DES MÉTADONNÉES POUR ÉVITER LES RECHARGEMENTS
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (priority) {
      // Pour les vidéos prioritaires, charger complètement immédiatement
      video.preload = 'auto';
      video.load();
      setMetadataLoaded(true);
    } else if (isVisible) {
      // Pour les vidéos visibles, charger complètement
      video.preload = 'auto';
      if (!metadataLoaded) {
        video.load();
        setMetadataLoaded(true);
      }
    } else if (isNearViewport) {
      // Pour les vidéos proches de la viewport, précharger les métadonnées
      video.preload = 'metadata';
      if (!metadataLoaded) {
        video.load();
        setMetadataLoaded(true);
      }
    } else if (isMobileDevice && !priority) {
      // SUR MOBILE: Précharger même les vidéos lointaines pour éviter les blocages
      video.preload = 'metadata';
      if (!metadataLoaded) {
        video.load();
        setMetadataLoaded(true);
      }
    } else {
      // Pour les vidéos lointaines sur desktop, preload minimal
      video.preload = 'none';
    }
  }, [priority, isVisible, isNearViewport, isMobileDevice, metadataLoaded]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: ''
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted group cursor-pointer',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onClick={onClick || togglePlay}
    >
      {/* Skeleton de chargement */}
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Vidéo d'erreur */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Vidéo non disponible</p>
          </div>
        </div>
      )}

      {/* Vidéo principale - directe */}
      {(priority || isVisible || (isMobileDevice && isNearViewport)) && !hasError && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          preload={priority ? 'auto' : (isVisible ? 'metadata' : 'none')}
          autoPlay={autoPlay}
          muted={isMuted}
          loop={loop}
          playsInline
          onLoadedData={handleLoad}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          style={{
            backgroundColor: '#000',
          }}
        />
      )}

      {/* Poster/thumbnail simplifié */}
      {isLoading && isVisible && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <p className="text-sm opacity-70">Chargement ultra-rapide...</p>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder pour lazy loading */}
      {!isVisible && !priority && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}

      {/* Contrôles de lecture */}
      {showControls && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-2 bg-black/50 rounded-full p-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="text-white hover:text-primary transition-colors"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="text-white hover:text-primary transition-colors"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Indicateur de chargement */}
      {isLoading && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

// Composant principal OptimizedMediaWithCache
const OptimizedMediaWithCacheComponent = ({
  src,
  alt,
  type,
  aspectRatio = 'auto',
  className,
  priority = false,
  quality = 'medium',
  onLoad,
  onError,
  onClick,
  showControls = true,
  autoPlay = false,
  muted = true,
  loop = false
}: OptimizedMediaWithCacheProps) => {

  if (type === 'video') {
    return (
      <OptimizedVideoWithCache
        src={src}
        aspectRatio={aspectRatio}
        className={className}
        priority={priority}
        onLoad={onLoad}
        onError={onError}
        onClick={onClick}
        showControls={showControls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
      />
    );
  }

  return (
    <OptimizedImageWithCache
      src={src}
      alt={alt}
      aspectRatio={aspectRatio}
      className={className}
      priority={priority}
      quality={quality}
      onLoad={onLoad}
      onError={onError}
      onClick={onClick}
    />
  );
};

// Export avec memoization
export const OptimizedMediaWithCache = memo(OptimizedMediaWithCacheComponent, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.type === nextProps.type &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.priority === nextProps.priority &&
    prevProps.quality === nextProps.quality
  );
});
