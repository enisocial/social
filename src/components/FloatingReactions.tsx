import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

interface FloatingReactionsProps {
  streamId: string;
}

const reactionEmojiMap: Record<string, string> = {
  like: '👍',
  love: '❤️',
  wow: '😮',
  clap: '👏',
};

export const FloatingReactions = ({ streamId }: FloatingReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const addReaction = (emoji: string) => {
    const newReaction: Reaction = {
      id: Math.random().toString(),
      emoji,
      x: Math.random() * 80 + 10, // Random position between 10% and 90%
    };

    setReactions(prev => [...prev, newReaction]);

    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  };

  // Listen to realtime reactions
  useEffect(() => {
    const channel = supabase
      .channel(`live-reactions-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_reactions',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const reactionType = payload.new.reaction_type as string;
          const emoji = reactionEmojiMap[reactionType] || '🎉';
          addReaction(emoji);
        }
      )
      .subscribe();

    // Custom event listener for manual triggers
    const handleCustomReaction = (event: CustomEvent) => {
      addReaction(event.detail.emoji);
    };

    window.addEventListener('live-reaction' as any, handleCustomReaction as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('live-reaction' as any, handleCustomReaction as EventListener);
    };
  }, [streamId]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ 
              y: '100vh',
              x: `${reaction.x}%`,
              opacity: 1,
              scale: 0.8,
              rotate: -20
            }}
            animate={{ 
              y: '-30vh',
              scale: [0.8, 1.5, 1.2, 1],
              opacity: [1, 1, 1, 0],
              rotate: [- 20, 10, -10, 0],
              x: [`${reaction.x}%`, `${reaction.x + 5}%`, `${reaction.x - 5}%`, `${reaction.x}%`]
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              duration: 3.5,
              ease: [0.16, 1, 0.3, 1], // Custom easing for smooth motion
              times: [0, 0.3, 0.6, 1]
            }}
            className="absolute text-5xl drop-shadow-2xl"
            style={{ 
              left: 0,
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const triggerReaction = (emoji: string) => {
  window.dispatchEvent(new CustomEvent('live-reaction', { detail: { emoji } }));
};
