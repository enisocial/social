import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadMessageCount {
  [conversationId: string]: number;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCount>({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Récupérer les messages non lus pour toutes les conversations
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Récupérer toutes les conversations de l'utilisateur
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!conversations?.length) {
        setUnreadCounts({});
        setTotalUnread(0);
        return;
      }

      const conversationIds = conversations.map(c => c.conversation_id);

      // Compter les messages non lus pour chaque conversation
      const counts: UnreadMessageCount = {};
      let total = 0;

      for (const convId of conversationIds) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('read', false)
          .neq('sender_id', user.id);

        const unreadCount = count || 0;
        counts[convId] = unreadCount;
        total += unreadCount;
      }

      setUnreadCounts(counts);
      setTotalUnread(total);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCounts({});
      setTotalUnread(0);
    }
  }, [user?.id]);

  // Marquer les messages comme lus pour une conversation
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Marquer tous les messages de cette conversation comme lus
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      // Mettre à jour le compteur local
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));
      setTotalUnread(prev => Math.max(0, prev - (unreadCounts[conversationId] || 0)));

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user?.id, unreadCounts]);

  // Obtenir le nombre de messages non lus pour une conversation spécifique
  const getUnreadCount = useCallback((conversationId: string): number => {
    return unreadCounts[conversationId] || 0;
  }, [unreadCounts]);

  // Obtenir le nombre total de messages non lus
  const getTotalUnread = useCallback((): number => {
    return totalUnread;
  }, [totalUnread]);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new;
          // Si le message n'est pas de l'utilisateur actuel, incrémenter le compteur
          if (message.sender_id !== user.id) {
            setUnreadCounts(prev => ({
              ...prev,
              [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
            }));
            setTotalUnread(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new;
          // Si le message a été marqué comme lu
          if (message.read && message.sender_id !== user.id) {
            setUnreadCounts(prev => {
              const currentCount = prev[message.conversation_id] || 0;
              return {
                ...prev,
                [message.conversation_id]: Math.max(0, currentCount - 1)
              };
            });
            setTotalUnread(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Récupération initiale
    fetchUnreadCounts();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchUnreadCounts]);

  return {
    unreadCounts,
    totalUnread,
    getUnreadCount,
    getTotalUnread,
    markAsRead,
    refreshUnreadCounts: fetchUnreadCounts
  };
};
