import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUnreadMessages } from './useUnreadMessages';

interface BadgeCounts {
  messages: number;
  notifications: number;
  friendRequests: number;
  total: number;
}

export const useNotificationBadges = () => {
  const { user } = useAuth();
  const { totalUnread: messagesCount } = useUnreadMessages();
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    messages: 0,
    notifications: 0,
    friendRequests: 0,
    total: 0
  });

  // Mettre à jour les compteurs de messages
  useEffect(() => {
    setBadgeCounts(prev => ({
      ...prev,
      messages: messagesCount || 0,
      total: prev.notifications + prev.friendRequests + (messagesCount || 0)
    }));
  }, [messagesCount]);

  // Récupérer les compteurs de notifications et demandes d'amis
  const fetchOtherCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Compter les notifications non lues
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Compter les demandes d'amis en attente
      const { count: friendRequestsCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      const newCounts = {
        messages: badgeCounts.messages,
        notifications: notificationsCount || 0,
        friendRequests: friendRequestsCount || 0,
        total: (notificationsCount || 0) + (friendRequestsCount || 0) + badgeCounts.messages
      };

      setBadgeCounts(newCounts);
    } catch (error) {
      console.error('Error fetching badge counts:', error);
    }
  }, [user?.id, badgeCounts.messages]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!user?.id) return;

    fetchOtherCounts();

    // Abonnement aux notifications
    const notificationsChannel = supabase
      .channel('badge_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchOtherCounts();
        }
      )
      .subscribe();

    // Abonnement aux demandes d'amis
    const friendRequestsChannel = supabase
      .channel('badge_friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchOtherCounts();
        }
      )
      .subscribe();

    // Rafraîchir périodiquement
    const interval = setInterval(fetchOtherCounts, 30000);

    return () => {
      notificationsChannel.unsubscribe();
      friendRequestsChannel.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, fetchOtherCounts]);

  // Marquer les notifications comme lues
  const markNotificationsAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setBadgeCounts(prev => ({
        ...prev,
        notifications: 0,
        total: prev.total - prev.notifications
      }));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user?.id]);

  return {
    badgeCounts,
    markNotificationsAsRead,
    refreshCounts: fetchOtherCounts
  };
};
