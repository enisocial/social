import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Gift {
  id: string;
  emoji: string;
  name: string;
  value: number;
  x: number;
}

export const GiftAnimation = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);

  const addGift = (emoji: string, name: string, value: number) => {
    const newGift: Gift = {
      id: Math.random().toString(),
      emoji,
      name,
      value,
      x: Math.random() * 60 + 20, // Random position between 20% and 80%
    };

    setGifts(prev => [...prev, newGift]);

    // Remove gift after animation
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== newGift.id));
    }, 4000);
  };

  // Listen to gift events
  useEffect(() => {
    const handleGift = (event: CustomEvent) => {
      const { emoji, name, value } = event.detail;
      addGift(emoji, name, value);
    };

    window.addEventListener('live-gift' as any, handleGift as EventListener);

    return () => {
      window.removeEventListener('live-gift' as any, handleGift as EventListener);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {gifts.map((gift) => (
          <motion.div
            key={gift.id}
            initial={{ 
              y: '100vh',
              x: `${gift.x}%`,
              opacity: 0,
              scale: 0.3,
              rotate: -45
            }}
            animate={{ 
              y: '10vh',
              scale: [0.3, 1.5, 1.2, 1],
              opacity: [0, 1, 1, 1, 0],
              rotate: [45, 0, -10, 10, 0]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              duration: 4,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.2, 0.5, 0.8, 1]
            }}
            className="absolute left-0"
            style={{ left: 0 }}
          >
            <div className="relative">
              {/* Gift emoji */}
              <div className="text-7xl drop-shadow-2xl">
                {gift.emoji}
              </div>
              
              {/* Gift info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{gift.name}</span>
                  <span className="text-yellow-400 font-bold text-sm">+{gift.value}</span>
                </div>
              </motion.div>

              {/* Sparkle effect */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ 
                    x: 0,
                    y: 0,
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    x: Math.cos((i * Math.PI * 2) / 12) * 80,
                    y: Math.sin((i * Math.PI * 2) / 12) * 80,
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: 0.5,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
