import { useEffect, useRef, useState } from 'react';
import { SharedPostCard } from './SharedPostCard';

interface AnimatedSharedPostCardProps {
  share: any;
  index: number;
}

export const AnimatedSharedPostCard = ({ share, index }: AnimatedSharedPostCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger animation based on index
          setTimeout(() => {
            setIsVisible(true);
          }, Math.min(index * 75, 400)); // Max 400ms delay
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 blur-0'
          : 'opacity-0 translate-y-6 scale-98 blur-sm'
      }`}
      style={{
        transitionDelay: isVisible ? '0ms' : `${Math.min(index * 75, 400)}ms`,
        willChange: 'transform, opacity'
      }}
    >
      <SharedPostCard share={share} />
    </div>
  );
};
