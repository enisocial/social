import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useMessengerBadges = () => {
  const { user } = useAuth();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // AUTO-REFRESH AU MONTAGE
  useEffect(() => {
    if (user?.id) {
      // Appel direct sans dépendance pour éviter boucle
      const loadBadges = async () => {
        try {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('read', false)
            .neq('sender_id', user.id);

          setTotalUnreadMessages(count || 0);
          console.log('🔄 Initial badges loaded:', count);
        } catch (error) {
          console.error('Initial badge load error:', error);
        }
      };

      loadBadges();
    }
  }, [user?.id]);

  // FONCTION SIMPLIFIÉE POUR ÉVITER ERREURS
  const refreshBadges = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Comptage simple des messages non lus
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', user.id);

      setTotalUnreadMessages(count || 0);
      console.log('🔄 Badges refreshed:', count);

    } catch (error) {
      console.error('Badge refresh error:', error);
      setTotalUnreadMessages(0);
    }
  }, [user?.id]);

  // MARQUAGE SIMPLE
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('read', false)
        .neq('sender_id', user.id);

      // Refresh après marquage
      setTimeout(refreshBadges, 100);
      console.log('✅ Conversation marked as read:', conversationId);

    } catch (error) {
      console.error('Mark read error:', error);
    }
  }, [user?.id, refreshBadges]);

  // GETTERS SIMPLIFIÉS
  const getConversationUnreadCount = useCallback((conversationId: string) => {
    // TODO: Implémenter comptage par conversation
    return 0;
  }, []);

  const hasAnyUnreadMessages = useCallback(() => {
    return totalUnreadMessages > 0;
  }, [totalUnreadMessages]);

  const forceRefresh = useCallback(() => {
    refreshBadges();
  }, [refreshBadges]);

  return {
    totalUnreadMessages,
    conversationUnreadCounts: new Map(),
    lastUpdate: Date.now(),
    markConversationAsRead,
    forceRefresh,
    getConversationUnreadCount,
    hasAnyUnreadMessages
  };
};
