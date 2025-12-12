import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  updated_at: string;
  profile: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useGroupPosts = (groupId: string) => {
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          *,
          profile:profiles!user_id(name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GroupPost[];
    },
    enabled: !!groupId
  });

  const createPost = useMutation({
    mutationFn: async ({ 
      content, 
      mediaUrl, 
      mediaType 
    }: { 
      content: string; 
      mediaUrl?: string; 
      mediaType?: 'image' | 'video' 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content,
          media_url: mediaUrl || null,
          media_type: mediaType || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast.success('Publication créée');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('group_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast.success('Publication supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    posts,
    isLoading,
    createPost,
    deletePost
  };
};
