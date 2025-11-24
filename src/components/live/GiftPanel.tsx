import { motion } from 'framer-motion';
import { Gift, Sparkles, Heart, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GiftPanelProps {
  streamId: string;
  onClose: () => void;
}

const gifts = [
  { id: 'rose', icon: '🌹', name: 'Rose', value: 1, color: 'from-pink-500 to-red-500' },
  { id: 'heart', icon: '❤️', name: 'Coeur', value: 5, color: 'from-red-500 to-pink-600' },
  { id: 'diamond', icon: '💎', name: 'Diamant', value: 10, color: 'from-blue-400 to-purple-500' },
  { id: 'crown', icon: '👑', name: 'Couronne', value: 25, color: 'from-yellow-400 to-orange-500' },
  { id: 'rocket', icon: '🚀', name: 'Fusée', value: 50, color: 'from-purple-500 to-indigo-600' },
  { id: 'star', icon: '⭐', name: 'Étoile', value: 100, color: 'from-yellow-300 to-amber-500' },
];

export const GiftPanel = ({ streamId, onClose }: GiftPanelProps) => {
  const handleSendGift = async (gift: typeof gifts[0]) => {
    try {
      console.log('[Gift] 🎁 Attempting to send gift:', gift.name);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour envoyer des gifts');
        return;
      }

      // Use upsert to handle gift_type creation atomically (prevents race conditions)
      const { data: giftType, error: giftTypeError } = await supabase
        .from('gift_types')
        .upsert(
          {
            name: gift.name,
            icon: gift.icon,
            value: gift.value,
            animation_type: 'bounce',
            rarity: 'common',
          },
          { 
            onConflict: 'name', // If gift with this name exists, return it
            ignoreDuplicates: false 
          }
        )
        .select('id')
        .single();

      if (giftTypeError) {
        console.error('[Gift] ❌ Error upserting gift type:', giftTypeError);
        throw giftTypeError;
      }

      if (!giftType?.id) {
        throw new Error('Failed to get gift type ID');
      }

      console.log('[Gift] ✅ Gift type ID obtained:', giftType.id);

      // Send gift with retry logic (prevents temporary network errors)
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        const { error: insertError } = await supabase
          .from('live_gifts')
          .insert({
            stream_id: streamId,
            sender_id: user.id,
            gift_type_id: giftType.id,
            quantity: 1,
            total_value: gift.value,
          });

        if (!insertError) {
          console.log('[Gift] ✅ Gift sent successfully');
          toast.success(`${gift.name} envoyé! 🎉`);
          
          // Trigger animation
          window.dispatchEvent(new CustomEvent('live-gift', { 
            detail: { 
              emoji: gift.icon,
              name: gift.name,
              value: gift.value 
            } 
          }));
          
          onClose();
          return;
        }

        lastError = insertError as Error;
        console.error(`[Gift] ⚠️ Error sending gift (${retries} retries left):`, insertError);
        retries--;
        
        // Wait 200ms before retrying
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // If we get here, all retries failed
      throw lastError;
    } catch (error) {
      console.error('[Gift] ❌ Failed to send gift after all retries:', error);
      toast.error('Erreur lors de l\'envoi du gift. Veuillez réessayer.');
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-4 bottom-24 w-80 bg-black/90 backdrop-blur-lg rounded-2xl p-4 z-30"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="text-white font-bold">Envoyer un Gift</h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-white hover:bg-white/10 rounded-full"
        >
          <motion.div whileTap={{ scale: 0.9 }}>
            X
          </motion.div>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {gifts.map((gift) => (
          <motion.button
            key={gift.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSendGift(gift)}
            className={`relative p-4 rounded-xl bg-gradient-to-br ${gift.color} text-white overflow-hidden group`}
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <span className="text-4xl">{gift.icon}</span>
              <span className="font-bold text-sm">{gift.name}</span>
              <div className="flex items-center gap-1 text-xs">
                <Sparkles className="w-3 h-3" />
                <span>{gift.value} coins</span>
              </div>
            </div>

            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ scale: 0, borderRadius: '100%' }}
              whileTap={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </motion.button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <p className="text-white/60 text-xs text-center">
          Les gifts soutiennent directement le streamer 💜
        </p>
      </div>
    </motion.div>
  );
};
