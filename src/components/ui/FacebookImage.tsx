import React, { useState, useEffect, useRef } from 'react';
import { generateSrcSet, generateSizes, getOptimalImageUrl, ImageSizes } from '@/utils/imageOptimizer';
import { cn } from '@/lib/utils';

// Hook pour intersection observer ultra-rapide
const useIntersectionObserver = (ref: React.RefObject<Element>, options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const mainObserver = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.01, rootMargin: '10px', ...options }
    );

    const preloadObserver = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { threshold: 0, rootMargin: '300px', ...options }
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

interface FacebookImageProps {
  src: string | ImageSizes;
  alt: string;
  className?: string;
  containerWidth?: number;
  containerHeight?: number;
  lazy?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: boolean;
  shadow?: boolean;
}

export const FacebookImage: React.FC<FacebookImageProps> = ({
  src,
  alt,
  className,
  containerWidth,
  containerHeight,
  lazy = true,
  priority = false,
  onLoad,
  onError,
  objectFit = 'cover',
  rounded = false,
  shadow = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [optimalSrc, setOptimalSrc] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // ULTRA-RAPIDE: Précharger immédiatement pour les images prioritaires
  useEffect(() => {
    if (priority) {
      // Charger immédiatement les images prioritaires
      if (typeof src === 'string') {
        setOptimalSrc(src);
      } else {
        const optimal = getOptimalImageUrl(src, containerWidth || 0, containerHeight || 0);
        setOptimalSrc(optimal);
      }
    }
  }, [src, containerWidth, containerHeight, priority]);

  // Pour les images non-prioritaires, utiliser intersection observer ultra-rapide
  const { isIntersecting: isVisible, isNearViewport } = useIntersectionObserver(
    containerRef,
    { threshold: 0.01, rootMargin: '10px' }
  );

  useEffect(() => {
    if (!priority && (isVisible || isNearViewport)) {
      if (typeof src === 'string') {
        setOptimalSrc(src);
      } else {
        const optimal = getOptimalImageUrl(src, containerWidth || 0, containerHeight || 0);
        setOptimalSrc(optimal);
      }
    }
  }, [src, containerWidth, containerHeight, priority, isVisible, isNearViewport]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center text-muted-foreground',
          rounded && 'rounded-lg',
          shadow && 'shadow-md',
          className
        )}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Image indisponible</div>
        </div>
      </div>
    );
  }

  // Generate responsive attributes if we have ImageSizes
  const responsiveProps: any = {};
  if (typeof src === 'object') {
    responsiveProps.srcSet = generateSrcSet(src);
    responsiveProps.sizes = generateSizes(containerWidth);
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', rounded && 'rounded-lg', shadow && 'shadow-md')}>
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            rounded && 'rounded-lg',
            className
          )}
        />
      )}
      <img
        src={optimalSrc}
        alt={alt}
        loading={priority ? 'eager' : lazy ? 'lazy' : 'eager'}
        decoding="async"
        className={cn(
          'w-full h-full transition-opacity duration-300',
          `object-${objectFit}`,
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...responsiveProps}
      />
    </div>
  );
};

export default FacebookImage;
