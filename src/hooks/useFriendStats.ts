import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FriendInteractionStats {
  userId: string;
  postsLiked: number;
  commentsCount: number;
  mutualPosts: number;
  lastInteraction: string | null;
}

export const useFriendStats = (currentUserId?: string, friendId?: string) => {
  // Optimized: Single RPC call replaces 6 sequential queries
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['friend-stats', currentUserId, friendId],
    queryFn: async () => {
      if (!currentUserId || !friendId) return null;
      
      const { data, error } = await supabase.rpc('get_friend_interaction_stats', {
        p_user_id: currentUserId,
        p_friend_id: friendId
      });
      
      if (error) {
        console.error('Error fetching friend stats:', error);
        return null;
      }
      
      const result = data?.[0];
      return {
        userId: friendId,
        postsLiked: result?.posts_liked || 0,
        commentsCount: result?.comments_count || 0,
        mutualPosts: 0,
        lastInteraction: result?.last_interaction || null,
      } as FriendInteractionStats;
    },
    enabled: !!currentUserId && !!friendId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { stats, loading };
};
