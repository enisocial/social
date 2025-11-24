import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url: string | null;
  };
}

export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!messageId) return;

    fetchReactions();
    setupRealtimeSubscription();

    return () => {
      supabase.removeChannel(supabase.channel(`reactions:${messageId}`));
    };
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          *,
          user:profiles!user_id (
            name,
            avatar_url
          )
        `)
        .eq('message_id', messageId);

      if (error) throw error;
      setReactions(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();
  };

  const addReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) throw error;
    } catch (error: any) {
      if (error.code === '23505') {
        // Duplicate reaction, remove it instead
        await removeReaction(emoji);
      } else {
        console.error('Error adding reaction:', error);
        toast.error('Erreur lors de l\'ajout de la réaction');
      }
    }
  };

  const removeReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Erreur lors de la suppression de la réaction');
    }
  };

  return {
    reactions,
    loading,
    addReaction,
    removeReaction
  };
};
