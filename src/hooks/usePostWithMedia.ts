import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePostWithMedia = (postId: string) => {
  // Fetch post media
  const { data: postMedia } = useQuery({
    queryKey: ['post-media', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_media')
        .select('*')
        .eq('post_id', postId)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch post tags
  const { data: postTags } = useQuery({
    queryKey: ['post-tags', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
        `)
        .eq('post_id', postId);
      
      if (error) throw error;
      return data || [];
    }
  });

  return { postMedia, postTags };
};