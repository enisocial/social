import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useBadgeSync = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState({
    messages: 0,
    notifications: 0,
    friendRequests: 0,
    key: Date.now() // Clé unique pour forcer rerender
  });

  const refreshBadges = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ useBadgeSync: Pas d\'utilisateur');
      return;
    }

    console.log('🔄 useBadgeSync: Actualisation pour user:', user.id);

    try {
      // Compter messages non lus
      let messagesCount = 0;
      console.log('📋 useBadgeSync: Recherche conversations...');

      const { data: conversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) {
        console.error('❌ useBadgeSync: Erreur conversations:', convError);
        return;
      }

      console.log('📋 useBadgeSync: Conversations trouvées:', conversations?.length || 0);

      if (conversations && conversations.length > 0) {
        for (const conv of conversations) {
          console.log('💬 useBadgeSync: Comptage pour conv:', conv.conversation_id);

          const { count, error: msgError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .eq('read', false)
            .neq('sender_id', user.id);

          if (msgError) {
            console.error('❌ useBadgeSync: Erreur messages:', msgError);
          } else {
            const countValue = count || 0;
            messagesCount += countValue;
            console.log('💬 useBadgeSync: Messages non lus:', countValue, 'Total:', messagesCount);
          }
        }
      }

      // Compter notifications
      console.log('🔔 useBadgeSync: Comptage notifications...');
      const { count: notificationsCount, error: notifError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (notifError) {
        console.error('❌ useBadgeSync: Erreur notifications:', notifError);
      }

      // Compter demandes d'amis
      console.log('👥 useBadgeSync: Comptage demandes d\'amis...');
      const { count: friendRequestsCount, error: friendError } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (friendError) {
        console.error('❌ useBadgeSync: Erreur demandes d\'amis:', friendError);
      }

      const finalCounts = {
        messages: messagesCount,
        notifications: notificationsCount || 0,
        friendRequests: friendRequestsCount || 0,
        key: Date.now()
      };

      console.log('✅ useBadgeSync: Comptage final:', finalCounts);

      // FORCE RERENDER avec clé unique
      setBadges(finalCounts);

    } catch (error) {
      console.error('❌ useBadgeSync: Erreur générale:', error);
    }
  }, [user?.id]);

  // Polling agressif (1 seconde)
  useEffect(() => {
    if (!user?.id) return;

    refreshBadges();
    const interval = setInterval(refreshBadges, 1000);

    // WebSocket
    const channel = supabase
      .channel('badge_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
        () => setTimeout(refreshBadges, 200))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },
        () => setTimeout(refreshBadges, 200))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' },
        () => setTimeout(refreshBadges, 200))
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user?.id, refreshBadges]);

  return badges;
};
