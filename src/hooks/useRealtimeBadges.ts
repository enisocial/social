import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

// Hook pour forcer la mise à jour des composants
const useForceUpdate = () => {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => {
    setTick(tick => tick + 1);
  }, []);
  return forceUpdate;
};

interface BadgeState {
  messages: number;
  notifications: number;
  friendRequests: number;
  total: number;
  lastUpdate: number;
}

export const useRealtimeBadges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [badgeState, setBadgeState] = useState<BadgeState>({
    messages: 0,
    notifications: 0,
    friendRequests: 0,
    total: 0,
    lastUpdate: Date.now()
  });

  const lastKnownCounts = useRef({
    messages: 0,
    notifications: 0,
    friendRequests: 0
  });

  // Fonction principale pour compter tous les badges depuis la DB
  const countAllBadges = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ Pas d\'utilisateur connecté');
      return;
    }

    try {
      console.log('🔍 Comptage badges pour user:', user.id);

      // 1. Compter les messages non lus
      let totalUnreadMessages = 0;
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (conversations && conversations.length > 0) {
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .eq('read', false)
            .neq('sender_id', user.id);

          totalUnreadMessages += count || 0;
          console.log(`💬 Conv ${conv.conversation_id}: ${count || 0} non lus`);
        }
      }

      // 2. Compter les notifications non lues
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // 3. Compter les demandes d'amis
      const { count: friendRequestsCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      const newState = {
        messages: totalUnreadMessages,
        notifications: notificationsCount || 0,
        friendRequests: friendRequestsCount || 0,
        total: totalUnreadMessages + (notificationsCount || 0) + (friendRequestsCount || 0),
        lastUpdate: Date.now()
      };

      console.log('📊 NOUVEL ÉTAT BADGES:', newState);

      // Vérifier si quelque chose a changé
      const hasChanged =
        newState.messages !== lastKnownCounts.current.messages ||
        newState.notifications !== lastKnownCounts.current.notifications ||
        newState.friendRequests !== lastKnownCounts.current.friendRequests;

      if (hasChanged) {
        console.log('🔄 BADGES CHANGÉS - MISE À JOUR UI');
        lastKnownCounts.current = {
          messages: newState.messages,
          notifications: newState.notifications,
          friendRequests: newState.friendRequests
        };
      }

      setBadgeState(newState);
      queryClient.setQueryData(['realtime-badges', user.id], newState);

      return newState;
    } catch (error) {
      console.error('❌ Erreur comptage badges:', error);
      return badgeState;
    }
  }, [user?.id, queryClient]);

  // Polling agressif pour garantir la synchronisation
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 INITIALISATION BADGES TEMPS RÉEL');

    // Comptage initial
    countAllBadges();

    // Polling très fréquent (5 secondes) pour garantir synchro
    const pollingInterval = setInterval(() => {
      countAllBadges();
    }, 5000);

    // WebSocket comme sécurité supplémentaire
    const messagesChannel = supabase
      .channel('realtime_badges_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        console.log('🌐 WebSocket MESSAGE:', payload.eventType, payload.new);
        // Attendre 1s puis recompter pour laisser le temps à la DB
        setTimeout(countAllBadges, 1000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        console.log('🌐 WebSocket NOTIFICATION:', payload.eventType, payload.new);
        setTimeout(countAllBadges, 1000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, (payload) => {
        console.log('🌐 WebSocket FRIEND_REQUEST:', payload.eventType, payload.new);
        setTimeout(countAllBadges, 1000);
      })
      .subscribe();

    return () => {
      clearInterval(pollingInterval);
      messagesChannel.unsubscribe();
    };
  }, [user?.id, countAllBadges]);

  // Fonctions pour forcer la mise à jour
  const forceRefresh = useCallback(() => {
    console.log('🔄 FORÇAGE RAFRAÎCHISSEMENT BADGES');
    countAllBadges();
  }, [countAllBadges]);

  const markMessagesRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      console.log('✅ MARQUAGE MESSAGES LUS pour conversation:', conversationId);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      // Rafraîchir immédiatement
      setTimeout(countAllBadges, 500);
    } catch (error) {
      console.error('❌ Erreur marquage messages lus:', error);
    }
  }, [user?.id, countAllBadges]);

  return {
    badgeState,
    forceRefresh,
    markMessagesRead,
    countAllBadges
  };
};
