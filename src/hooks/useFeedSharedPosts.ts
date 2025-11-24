import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFeedSharedPosts = (userId?: string) => {
  const { data: sharedPosts, isLoading } = useQuery({
    queryKey: ['feed-shared-posts', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get friend IDs
      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      const friendIds = friendRequests?.map(fr => 
        fr.sender_id === userId ? fr.receiver_id : fr.sender_id
      ) || [];

      if (friendIds.length === 0) return [];

      // Get shared posts from friends (profile shares)
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
        .in('shared_by', friendIds)
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
