import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { playNotificationSound } from '@/utils/notification-sound';

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'order';
  metadata: any;
  read: boolean;
  created_at: string;
  post_id?: string;
  comment_id?: string;
  content_preview?: string;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
  };
}

const PAGE_SIZE = 20;

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications with pagination using cached edge function
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { notifications: [], unreadCount: 0, nextPage: null };

      const { data: response, error } = await supabase.functions.invoke('cached-notifications', {
        body: {
          limit: PAGE_SIZE,
          offset: pageParam,
        }
      });

      if (error) throw error;

      // Update unread count from cached response
      if (response.unreadCount !== undefined) {
        setUnreadCount(response.unreadCount);
      }

      return {
        notifications: response.notifications as Notification[],
        nextPage: response.hasMore ? pageParam + PAGE_SIZE : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user,
    staleTime: 60000, // 1 minute cache on client-side
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Initial fetch handled by the query above, no need for separate effect

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          playNotificationSound();
          
          // Update unread count
          setUnreadCount(prev => prev + 1);
          
          // Invalidate queries to refresh the list
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update unread count if notification was marked as read
          if (payload.new.read && !payload.old.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Invalidate Redis cache
      await supabase.functions.invoke('invalidate-cache', {
        body: { type: 'notifications', userId: user?.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      // Invalidate Redis cache
      await supabase.functions.invoke('invalidate-cache', {
        body: { type: 'notifications', userId: user?.id }
      });
    },
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const notifications = data?.pages.flatMap(page => page.notifications) || [];

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending
  };
};
