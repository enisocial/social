import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

interface ReactionCount {
  type: ReactionType;
  count: number;
}

export const useCommentReactions = (commentId: string, userId?: string) => {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`comment-reactions:${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
          filter: `comment_id=eq.${commentId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentId, userId]);

  const fetchReactions = async () => {
    try {
      const { data } = await supabase
        .from('comment_reactions')
        .select('reaction_type, user_id')
        .eq('comment_id', commentId);

      if (data) {
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

    try {
      if (userReaction === reactionType) {
        await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        setUserReaction(null);
      } else if (userReaction) {
        await supabase
          .from('comment_reactions')
          .update({ reaction_type: reactionType })
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        setUserReaction(reactionType);
      } else {
        await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: userId,
            reaction_type: reactionType,
          });
        setUserReaction(reactionType);
      }
    } catch (error: any) {
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
