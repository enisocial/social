import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
      if (!user) return { notifications: [], nextPage: null };

      const { data: response, error } = await supabase.functions.invoke('cached-notifications', {
        body: {
          limit: PAGE_SIZE,
          offset: pageParam,
        }
      });

      if (error) throw error;

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

  // Simple query for unread count only
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      if (!user) return { unreadCount: 0 };

      const { data: response, error } = await supabase.functions.invoke('cached-notifications', {
        body: { countOnly: true }
      });

      if (error) return { unreadCount: 0 };
      return { unreadCount: response.unreadCount || 0 };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider fresh for 10 seconds
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

          // Invalidate queries to refresh both list and count
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
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
          // Invalidate queries when notification is marked as read
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
    }
  });

  const notifications = data?.pages.flatMap(page => page.notifications) || [];
  const unreadCount = unreadData?.unreadCount || 0;

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
