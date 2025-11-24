import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

export interface OnlineFriend {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  online: boolean;
  last_seen: string | null;
  unread_count: number;
  conversation_id?: string;
}

export const useOnlineFriends = (userId?: string) => {
  // Optimized: Single RPC call instead of multiple sequential queries
  const { data: onlineFriends = [], isLoading, refetch } = useQuery({
    queryKey: ['online-friends', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_online_friends_optimized', {
        user_id_param: userId
      });
      
      if (error) {
        console.error('Error fetching online friends:', error);
        return [];
      }
      
      return (data || []) as OnlineFriend[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
  });

  // Debounced refetch to prevent excessive re-renders (1 second delay)
  const debouncedRefetch = useDebounce(useCallback(() => {
    refetch();
  }, [refetch]), 1000);

  useEffect(() => {
    if (!userId) return;

    // Single aggregated Real-time subscription for presence updates
    const presenceChannel = supabase
      .channel('online-friends-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          // Debounced refetch on any presence change (prevents excessive re-renders)
          debouncedRefetch();
        }
      )
      .subscribe();

    // Single aggregated Real-time subscription for conversation updates
    const conversationsChannel = supabase
      .channel('online-friends-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Debounced refetch on conversation changes
          debouncedRefetch();
        }
      )
      .subscribe();

    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(conversationsChannel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, debouncedRefetch, refetch]);

  return { 
    onlineFriends, 
    loading: isLoading, 
    refetch 
  };
};
