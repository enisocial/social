import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
    setLoading(false);
  };

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase.rpc('promote_to_admin_rpc', {
      target_user_id: userId
    });

    if (error) {
      toast.error(error.message || 'Erreur lors de la promotion');
      return;
    }

    toast.success('Utilisateur promu administrateur');
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase.rpc('delete_user_rpc', {
      target_user_id: userId
    });

    if (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
      return;
    }

    toast.success('Utilisateur supprimé');
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.rpc('delete_post_rpc', {
      target_post_id: postId
    });

    if (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
      return;
    }

    toast.success('Post supprimé');
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.rpc('delete_comment_rpc', {
      target_comment_id: commentId
    });

    if (error) {
      toast.error(error.message || 'Erreur lors de la suppression');
      return;
    }

    toast.success('Commentaire supprimé');
  };

  return {
    isAdmin,
    loading,
    promoteToAdmin,
    deleteUser,
    deletePost,
    deleteComment
  };
};
