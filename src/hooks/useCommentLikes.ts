import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCommentLikes = (commentId: string, userId?: string) => {
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comment-likes:${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
          filter: `comment_id=eq.${commentId}`
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentId, userId]);

  const fetchLikes = async () => {
    try {
      // Get total likes count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      setLikesCount(count || 0);

      // Check if current user has liked
      if (userId) {
        const { data } = await supabase
          .from('comment_likes')
          .select('id')
          .eq('comment_id', commentId)
          .eq('user_id', userId)
          .maybeSingle();

        setIsLiked(!!data);
      }
    } catch (error) {
      console.error('Error fetching comment likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: userId,
          });

        if (error) throw error;

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      if (error.code !== '23505') { // Ignore duplicate key errors
        toast.error('Erreur lors de l\'action');
      }
    }
  };

  return {
    likesCount,
    isLiked,
    loading,
    toggleLike,
  };
};
