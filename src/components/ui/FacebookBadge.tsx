import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FacebookBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'destructive' | 'secondary';
  showZero?: boolean;
  animate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const FacebookBadge: React.FC<FacebookBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'md',
  variant = 'destructive',
  showZero = false,
  animate = true,
  className,
  children
}) => {
  const [prevCount, setPrevCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  // Détecter les changements pour déclencher l'animation
  useEffect(() => {
    if (count !== prevCount && count > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      setPrevCount(count);
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  // Ne rien afficher si count = 0 et showZero = false
  if (count === 0 && !showZero) {
    return children ? <>{children}</> : null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Tailles Facebook-like
  const sizeClasses = {
    sm: 'h-4 w-4 text-xs px-1',
    md: 'h-5 w-5 text-xs px-1.5',
    lg: 'h-6 w-6 text-sm px-2'
  };

  // Variants de couleur Facebook
  const variantClasses = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white'
  };

  // Animation d'apparition (comme Facebook Messenger)
  const badgeVariants = {
    initial: {
      scale: 0,
      opacity: 0,
      y: -10
    },
    animate: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 20,
        duration: 0.3
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.5, 1],
        ease: 'easeInOut' as const
      }
    }
  };

  const badgeContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayCount}
        variants={badgeVariants}
        initial="initial"
        animate={isAnimating && animate ? ['animate', 'pulse'] : 'animate'}
        exit="exit"
        className={cn(
          'absolute -top-1 -right-1 rounded-full flex items-center justify-center font-semibold shadow-lg border-2 border-white',
          'pointer-events-none select-none z-10',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        <motion.span
          key={displayCount}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {displayCount}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );

  // Si on a des children, on wrap le badge autour
  if (children) {
    return (
      <div className="relative inline-block">
        {children}
        {badgeContent}
      </div>
    );
  }

  // Sinon on retourne juste le badge
  return badgeContent;
};

// Hook pour gérer l'état des badges avec animation
export const useFacebookBadge = (initialCount = 0) => {
  const [count, setCount] = useState(initialCount);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setIsVisible(true);
    } else {
      // Délai pour l'animation de disparition
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const increment = (amount = 1) => setCount(prev => prev + amount);
  const decrement = (amount = 1) => setCount(prev => Math.max(0, prev - amount));
  const reset = () => setCount(0);
  const set = (value: number) => setCount(Math.max(0, value));

  return {
    count,
    isVisible,
    increment,
    decrement,
    reset,
    set,
    badge: (
      <FacebookBadge
        count={count}
        animate={true}
        size="md"
        variant="destructive"
      />
    )
  };
};

// Composant spécialisé pour les badges de conversation (avec animation de bulle)
export const ConversationBadge: React.FC<{
  unreadCount: number;
  isActive?: boolean;
  className?: string;
}> = ({ unreadCount, isActive = false, className }) => {
  return (
    <FacebookBadge
      count={unreadCount}
      maxCount={99}
      size="md"
      variant="destructive"
      animate={true}
      className={cn(
        isActive && 'ring-2 ring-blue-500 ring-opacity-50',
        className
      )}
    />
  );
};

// Composant spécialisé pour le badge global Messenger
export const MessengerBadge: React.FC<{
  totalUnread: number;
  className?: string;
}> = ({ totalUnread, className }) => {
  return (
    <FacebookBadge
      count={totalUnread}
      maxCount={99}
      size="md"
      variant="destructive"
      animate={true}
      className={cn(
        'shadow-lg',
        totalUnread > 10 && 'animate-pulse',
        className
      )}
    />
  );
};
