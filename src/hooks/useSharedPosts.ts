import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSharedPosts = (userId?: string) => {
  const { data: sharedPosts, isLoading } = useQuery({
    queryKey: ['shared-posts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get shared posts by this specific user
      const { data, error } = await supabase
        .from('post_shares')
        .select(`
          id,
          post_id,
          share_message,
          created_at,
          shared_by,
          share_type,
          shared_by_profile:profiles!shared_by(id, name, username, avatar_url)
        `)
        .eq('shared_by', userId)
        .eq('share_type', 'profile')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  return {
    sharedPosts: sharedPosts || [],
    isLoading,
  };
};
