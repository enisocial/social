import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

export const LazyImage = ({ src, alt, className, placeholderClassName }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Preload images 200px before they become visible
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {!isLoaded && (
        <div className={cn('absolute inset-0 animate-pulse bg-muted', placeholderClassName)} />
      )}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        className={cn('w-full h-full object-cover transition-opacity', {
          'opacity-0': !isLoaded,
          'opacity-100': isLoaded,
        })}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
      />
    </div>
  );
};
