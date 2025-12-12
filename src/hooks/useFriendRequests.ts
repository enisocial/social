import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedFriendRequests as useOptimized } from './useOptimizedFriendRequests';

// Re-export types
export type { FriendRequest } from './useOptimizedFriendRequests';

/**
 * @deprecated Use useOptimizedFriendRequests instead. This hook is kept for backward compatibility
 * but now wraps the optimized version and adds realtime subscription.
 */
export const useFriendRequests = (userId?: string) => {
  const queryClient = useQueryClient();
  const optimized = useOptimized();

  // Setup realtime subscription (missing in optimized hook, adding it here or in optimized one)
  // Actually, let's add it to the optimized hook instead and just re-export here.
  // But useOptimizedFriendRequests calls useAuth internally, while this one accepts userId.
  // We need to handle that.
  
  useEffect(() => {
    if (!userId) return;

    console.log('[FriendRequests] Setting up realtime subscription for user:', userId);

    const channel = supabase
      .channel(`friend_requests_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
          queryClient.invalidateQueries({ queryKey: ['friends'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
          queryClient.invalidateQueries({ queryKey: ['friends'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    ...optimized,
    // Add refetch for compatibility if needed, though queryClient invalidation handles it
    refetch: async () => {
      await queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['friends'] });
    }
  };
};
