import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string | null;
  like_count?: number;
  reply_count?: number;
  profiles: {
    username: string;
    name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export const useComments = (postId: string, limit: number = 10) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchComments(true);

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
        },
        () => {
          fetchComments(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchComments = async (reset: boolean = false) => {
    const currentOffset = reset ? 0 : offset;
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (username, name, avatar_url)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + limit - 1);

    if (error) {
      toast.error('Erreur lors du chargement des commentaires');
      return;
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            *,
            profiles (username, name, avatar_url)
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || []
        };
      })
    );

    if (reset) {
      setComments(commentsWithReplies as Comment[]);
      setOffset(limit);
    } else {
      setComments(prev => [...prev, ...(commentsWithReplies as Comment[])]);
      setOffset(currentOffset + limit);
    }
    
    setHasMore((data || []).length === limit);
    setLoading(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchComments();
    }
  };

  const addComment = async (text: string, parentCommentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .insert({
        text,
        post_id: postId,
        user_id: user.id,
        parent_comment_id: parentCommentId || null
      });

    if (error) {
      toast.error('Erreur lors de l\'ajout du commentaire');
      return;
    }

    toast.success(parentCommentId ? 'Réponse ajoutée' : 'Commentaire ajouté');
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Commentaire supprimé');
  };

  return {
    comments,
    loading,
    hasMore,
    addComment,
    deleteComment,
    loadMore
  };
};
