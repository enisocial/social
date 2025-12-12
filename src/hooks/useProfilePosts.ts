import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProfilePosts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile-posts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Récupérer les posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Récupérer les médias pour tous les posts en une seule requête
      const postIds = posts.map(p => p.id);
      const { data: mediaData } = await supabase
        .from('post_media')
        .select('*')
        .in('post_id', postIds)
        .order('order_index');

      // Récupérer les tags
      const { data: tagsData } = await supabase
        .from('post_tags')
        .select(`
          *,
          tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
        `)
        .in('post_id', postIds);

      // Grouper les médias par post_id
      const mediaByPost = (mediaData || []).reduce((acc: any, media: any) => {
        if (!acc[media.post_id]) acc[media.post_id] = [];
        acc[media.post_id].push(media);
        return acc;
      }, {});

      // Grouper les tags par post_id
      const tagsByPost = (tagsData || []).reduce((acc: any, tag: any) => {
        if (!acc[tag.post_id]) acc[tag.post_id] = [];
        acc[tag.post_id].push(tag);
        return acc;
      }, {});

      // Enrichir les posts avec les médias et tags
      return posts.map(post => ({
        ...post,
        username: post.profiles?.username,
        name: post.profiles?.name,
        avatar_url: post.profiles?.avatar_url,
        post_media: mediaByPost[post.id] || [],
        post_tags: tagsByPost[post.id] || []
      }));
    },
    enabled: !!userId,
    staleTime: 30000
  });
};