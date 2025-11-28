import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useBadgeDebug = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    dbMessagesCount: 0,
    dbNotificationsCount: 0,
    dbFriendRequestsCount: 0,
    lastUpdate: Date.now(),
    websocketEvents: [] as string[]
  });

  // Fonction pour vérifier l'état réel de la DB
  const checkDatabaseState = async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 VÉRIFICATION ÉTAT DB POUR USER:', user.id);

      // Vérifier les conversations et messages non lus
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      console.log('📋 Conversations trouvées:', conversations?.length || 0);

      let totalUnreadMessages = 0;
      if (conversations) {
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .eq('read', false)
            .neq('sender_id', user.id);

          totalUnreadMessages += count || 0;
          console.log(`💬 Conversation ${conv.conversation_id}: ${count || 0} messages non lus`);
        }
      }

      // Vérifier les notifications
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Vérifier les demandes d'amis
      const { count: friendRequestsCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      const newDebugInfo = {
        dbMessagesCount: totalUnreadMessages,
        dbNotificationsCount: notificationsCount || 0,
        dbFriendRequestsCount: friendRequestsCount || 0,
        lastUpdate: Date.now(),
        websocketEvents: debugInfo.websocketEvents
      };

      console.log('📊 ÉTAT DB RÉEL:', newDebugInfo);
      setDebugInfo(newDebugInfo);

      return newDebugInfo;
    } catch (error) {
      console.error('❌ Erreur vérification DB:', error);
      return debugInfo;
    }
  };

  // Écouter tous les événements WebSocket
  useEffect(() => {
    if (!user?.id) return;

    const addWebSocketEvent = (event: string, data?: any) => {
      console.log('🌐 WebSocket Event:', event, data);
      setDebugInfo(prev => ({
        ...prev,
        websocketEvents: [...prev.websocketEvents.slice(-9), `${Date.now()}: ${event}`]
      }));
    };

    // Canal de debug pour tous les messages
    const debugChannel = supabase
      .channel('badge_debug')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const data = payload.new as any;
          addWebSocketEvent(`MESSAGE_${payload.eventType}`, {
            id: data?.id,
            sender: data?.sender_id,
            conversation: data?.conversation_id,
            read: data?.read
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const data = payload.new as any;
          addWebSocketEvent(`NOTIFICATION_${payload.eventType}`, {
            id: data?.id,
            read: data?.read
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const data = payload.new as any;
          addWebSocketEvent(`FRIEND_REQUEST_${payload.eventType}`, {
            id: data?.id,
            status: data?.status
          });
        }
      )
      .subscribe();

    // Vérification initiale
    checkDatabaseState();

    // Vérifications périodiques
    const interval = setInterval(checkDatabaseState, 10000);

    return () => {
      debugChannel.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  return {
    debugInfo,
    checkDatabaseState,
    clearEvents: () => setDebugInfo(prev => ({ ...prev, websocketEvents: [] }))
  };
};
