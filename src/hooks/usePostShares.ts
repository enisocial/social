import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharePostParams {
  postId: string;
  shareType: 'profile' | 'friend' | 'group';
  shareMessage?: string;
  sharedWithUserId?: string;
  sharedWithGroupId?: string;
}

export const usePostShares = (postId?: string) => {
  const queryClient = useQueryClient();

  // Get shares for a specific post
  const { data: shares, isLoading } = useQuery({
    queryKey: ['post-shares', postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await supabase
        .from('post_shares')
        .select(`
          *,
          shared_by_profile:profiles!shared_by(id, name, username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  // Share a post
  const sharePost = useMutation({
    mutationFn: async (params: SharePostParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('post_shares')
        .insert({
          post_id: params.postId,
          shared_by: user.id,
          share_type: params.shareType,
          share_message: params.shareMessage,
          shared_with_user_id: params.sharedWithUserId,
          shared_with_group_id: params.sharedWithGroupId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-shares'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Publication partagée avec succès');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Vous avez déjà partagé cette publication');
      } else {
        toast.error('Erreur lors du partage');
      }
    },
  });

  // Delete a share
  const deleteShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('post_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-shares'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Partage supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du partage');
    },
  });

  return {
    shares: shares || [],
    isLoading,
    sharePost: sharePost.mutate,
    isSharing: sharePost.isPending,
    deleteShare: deleteShare.mutate,
  };
};
