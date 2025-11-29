import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptimizedMedia } from '@/hooks/useOptimizedMedia';

interface OptimizedMediaProps {
  src: string;
  alt?: string;
  type: 'image' | 'video';
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  className?: string;
  priority?: boolean; // Pour les images importantes (premier écran)
  quality?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

// Hook pour gérer l'intersection observer avec préchargement intelligent
const useIntersectionObserver = (ref: React.RefObject<Element>, options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Observer principal pour intersection exacte
    const mainObserver = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    // Observer secondaire pour préchargement (zone plus large)
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '200px', // Zone de préchargement plus large
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

// Hook pour détecter si on est sur mobile
const useIsMobileDevice = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Hook pour optimiser les URLs d'images avec réduction mobile automatique
const useOptimizedImageUrl = (src: string, quality: 'low' | 'medium' | 'high' = 'medium') => {
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const isMobile = useIsMobileDevice();

  useEffect(() => {
    if (!src) return;

    // Réduction automatique de qualité sur mobile pour économiser la bande passante
    const effectiveQuality = isMobile ? (
      quality === 'high' ? 'medium' : quality === 'medium' ? 'low' : 'low'
    ) : quality;

    // Si c'est déjà une URL optimisée (Supabase, Cloudinary, etc.), utiliser directement
    if (src.includes('supabase') || src.includes('cloudinary') || src.includes('imgix')) {
      const qualityParams = {
        low: 'w=400&h=400&fit=crop&quality=70',
        medium: 'w=800&h=800&fit=crop&quality=80',
        high: 'w=1200&h=1200&fit=crop&quality=90'
      };

      // Pour Supabase Storage, ajouter les paramètres de transformation
      if (src.includes('supabase')) {
        const separator = src.includes('?') ? '&' : '?';
        setOptimizedSrc(`${src}${separator}${qualityParams[effectiveQuality]}`);
      } else {
        setOptimizedSrc(src);
      }
    } else {
      // Pour les autres URLs, utiliser directement
      setOptimizedSrc(src);
    }
  }, [src, quality, isMobile]);

  return optimizedSrc;
};

// Composant pour les images optimisées
const OptimizedImage = memo(({
  src,
  alt = '',
  aspectRatio = 'auto',
  className,
  priority = false,
  quality = 'medium',
  onLoad,
  onError,
  onClick
}: Omit<OptimizedMediaProps, 'type'>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isIntersecting: isVisible, isNearViewport } = useIntersectionObserver(containerRef, { threshold: 0.1 });
  const optimizedSrc = useOptimizedImageUrl(src, quality);

  // Charger l'image seulement quand elle devient visible (sauf priorité)
  useEffect(() => {
    if (priority || isVisible) {
      setImageSrc(optimizedSrc);
    }
  }, [priority, isVisible, optimizedSrc]);

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

      {/* Image principale */}
      {imageSrc && !hasError && (
        <img
          ref={imgRef}
          src={imageSrc}
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
      {!imageSrc && !priority && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

// Composant pour les vidéos optimisées
const OptimizedVideo = memo(({
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
}: Omit<OptimizedMediaProps, 'alt' | 'type' | 'quality'>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isIntersecting: isVisible, isNearViewport } = useIntersectionObserver(containerRef, { threshold: 0.1 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Gestion spéciale pour mobile - forcer le chargement même sans intersection
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;

    if (priority) {
      // Pour les vidéos prioritaires, précharger immédiatement
      video.preload = 'metadata';
      video.load();
    } else if (isVisible) {
      // Pour les vidéos visibles, charger complètement
      video.preload = 'auto';
      video.load();
    } else if (isNearViewport) {
      // Pour les vidéos proches de la viewport, précharger les métadonnées
      video.preload = 'metadata';
      video.load();
    } else if (isMobileDevice && !priority) {
      // SUR MOBILE: Précharger même les vidéos lointaines pour éviter les blocages
      video.preload = 'metadata';
      video.load();
    } else {
      // Pour les vidéos lointaines sur desktop, preload minimal
      video.preload = 'none';
    }
  }, [priority, isVisible, isNearViewport]);

  // Lecture automatique quand la vidéo devient visible (comme TikTok/Instagram)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && autoPlay) {
      // Petit délai pour éviter les conflits de chargement
      const timer = setTimeout(() => {
        video.play().catch((error) => {
          console.warn('Autoplay blocked:', error);
          // L'autoplay peut être bloqué par les navigateurs
          // Dans ce cas, on garde le poster visible
        });
      }, 100);

      return () => clearTimeout(timer);
    } else if (!isVisible && !video.paused) {
      // Mettre en pause quand la vidéo sort de la vue
      video.pause();
    }
  }, [isVisible, autoPlay]);

  // Optimisation du changement de source
  useEffect(() => {
    const video = videoRef.current;
    if (video && src) {
      // Forcer le rechargement pour un changement plus rapide
      video.load();
    }
  }, [src]);

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

      {/* Vidéo principale */}
      {!hasError && (
        <video
          ref={videoRef}
          src={src}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          preload={priority ? 'metadata' : 'none'}
          autoPlay={autoPlay}
          muted={isMuted}
          loop={loop}
          playsInline
          onLoadedData={handleLoad}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          poster={src.includes('supabase') ? `${src}?t=0.1` : undefined} // Poster pour Supabase
          style={{
            // S'assurer que le poster est visible avant le chargement
            backgroundColor: '#000',
          }}
        />
      )}

      {/* Poster/thumbnail personnalisé si la vidéo ne charge pas */}
      {isLoading && isVisible && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
          <div className="text-center text-white">
            <Play className="h-16 w-16 mx-auto mb-4 opacity-80" />
            <p className="text-sm opacity-70">Chargement de la vidéo...</p>
          </div>
        </div>
      )}

      {/* Placeholder pour lazy loading */}
      {(!isVisible && !priority) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

// Composant principal OptimizedMedia
const OptimizedMediaComponent = ({
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
}: OptimizedMediaProps) => {

  if (type === 'video') {
    return (
      <OptimizedVideo
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
    <OptimizedImage
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
export const OptimizedMedia = memo(OptimizedMediaComponent, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.type === nextProps.type &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.priority === nextProps.priority &&
    prevProps.quality === nextProps.quality
  );
});
