import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

interface ReactionCount {
  type: ReactionType;
  count: number;
}

export const usePostReactions = (postId: string, userId?: string) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`post-reactions:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          // Immediate UI update for INSERT
          const newReaction = payload.new as { reaction_type: ReactionType; user_id: string };
          
          setReactions(prev => {
            const existingIndex = prev.findIndex(r => r.type === newReaction.reaction_type);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                count: updated[existingIndex].count + 1
              };
              return updated;
            }
            return [...prev, { type: newReaction.reaction_type, count: 1 }];
          });

          if (userId && newReaction.user_id === userId) {
            setUserReaction(newReaction.reaction_type);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchReactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          // Immediate UI update for DELETE
          const oldReaction = payload.old as { reaction_type: ReactionType; user_id: string };
          
          setReactions(prev => {
            const updated = prev.map(r => 
              r.type === oldReaction.reaction_type
                ? { ...r, count: Math.max(0, r.count - 1) }
                : r
            ).filter(r => r.count > 0);
            return updated;
          });

          if (userId && oldReaction.user_id === userId) {
            setUserReaction(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, userId]);

  const fetchReactions = async () => {
    try {
      const { data } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', postId);

      if (data) {
        // Count reactions by type
        const countMap = new Map<ReactionType, number>();
        data.forEach(r => {
          const type = r.reaction_type as ReactionType;
          countMap.set(type, (countMap.get(type) || 0) + 1);
          if (userId && r.user_id === userId) {
            setUserReaction(type);
          }
        });

        const reactionCounts = Array.from(countMap.entries()).map(([type, count]) => ({
          type,
          count
        }));

        setReactions(reactionCounts);
        
        if (!data.some(r => r.user_id === userId)) {
          setUserReaction(null);
        }
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReaction = async (reactionType: ReactionType) => {
    if (!userId) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Optimistic UI update
    const previousReaction = userReaction;
    const previousReactions = [...reactions];

    try {
      if (userReaction === reactionType) {
        // Optimistic: remove reaction
        setUserReaction(null);
        setReactions(prev => {
          const updated = prev.map(r => 
            r.type === reactionType 
              ? { ...r, count: Math.max(0, r.count - 1) }
              : r
          ).filter(r => r.count > 0);
          return updated;
        });

        // Remove reaction
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        
        if (error) throw error;
      } else if (userReaction) {
        // Optimistic: update reaction
        setUserReaction(reactionType);
        setReactions(prev => {
          const updated = prev.map(r => {
            if (r.type === userReaction) {
              return { ...r, count: Math.max(0, r.count - 1) };
            }
            if (r.type === reactionType) {
              return { ...r, count: r.count + 1 };
            }
            return r;
          }).filter(r => r.count > 0);
          
          // Add new reaction type if it doesn't exist
          if (!updated.find(r => r.type === reactionType)) {
            updated.push({ type: reactionType, count: 1 });
          }
          
          return updated;
        });

        // Update existing reaction
        const { error } = await supabase
          .from('post_reactions')
          .update({ reaction_type: reactionType })
          .eq('post_id', postId)
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Optimistic: add reaction
        setUserReaction(reactionType);
        setReactions(prev => {
          const existingIndex = prev.findIndex(r => r.type === reactionType);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              count: updated[existingIndex].count + 1
            };
            return updated;
          }
          return [...prev, { type: reactionType, count: 1 }];
        });

        // Add new reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          });
        
        if (error) throw error;
      }
    } catch (error: any) {
      // Rollback on error
      setUserReaction(previousReaction);
      setReactions(previousReactions);
      
      console.error('Error toggling reaction:', error);
      if (error.code !== '23505') {
        toast.error('Erreur lors de la réaction');
      }
    }
  };

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return {
    reactions,
    userReaction,
    totalCount,
    loading,
    toggleReaction,
  };
};
