import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useMessengerBadges = () => {
  const { user } = useAuth();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // AUTO-REFRESH AU MONTAGE
  useEffect(() => {
    if (user?.id) {
      console.log('🔔 [BADGES] Loading badges for user:', user.id);
      // Appel direct sans dépendance pour éviter boucle
      const loadBadges = async () => {
        try {
          console.log('🔔 [BADGES] Executing badge query...');

          // SIMPLIFICATION: D'abord tester avec une requête basique pour voir si ça marche
          console.log('🔔 [BADGES] Testing basic message access first...');

          // Test 1: Voir si on peut accéder aux messages du tout
          const { data: basicTest, error: basicError } = await supabase
            .from('messages')
            .select('id, conversation_id, sender_id, read')
            .limit(1);

          if (basicError) {
            console.error('🔔 [BADGES] Basic message access failed:', basicError);
          } else {
            console.log('🔔 [BADGES] Basic message access works, found messages:', basicTest?.length || 0);
          }

          // Test 2: Voir si on peut accéder aux conversations de l'utilisateur
          const { data: convTest, error: convError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id)
            .limit(5);

          if (convError) {
            console.error('🔔 [BADGES] Conversation access failed:', convError);
          } else {
            console.log('🔔 [BADGES] User participates in conversations:', convTest?.length || 0);
          }

          // APPROCHE SIMPLIFIÉE: D'abord récupérer les conversations de l'utilisateur, puis compter les messages
          const { data: userConversations, error: conversationsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

          if (conversationsError) {
            console.error('🔔 [BADGES] Failed to get user conversations:', conversationsError);
            setTotalUnreadMessages(0);
            return;
          }

          let finalCount = 0;

          if (!userConversations || userConversations.length === 0) {
            console.log('🔔 [BADGES] User has no conversations, count = 0');
            finalCount = 0;
          } else {
            const conversationIds = userConversations.map(cp => cp.conversation_id);

            // Compter les messages non lus dans ces conversations
            const { count: msgCount, error: msgError } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('read', false)
              .in('conversation_id', conversationIds)
              .neq('sender_id', user.id);

            if (msgError) {
              console.error('🔔 [BADGES] Failed to count messages:', msgError);
              setTotalUnreadMessages(0);
              return;
            }

            finalCount = msgCount || 0;
          }

          console.log('🔔 [BADGES] Query successful, count:', finalCount);
          setTotalUnreadMessages(finalCount);
          console.log('🔄 Initial badges loaded:', finalCount);

        } catch (error) {
          console.error('🔔 [BADGES] Initial badge load error:', error);
          setTotalUnreadMessages(0);
        }
      };

      loadBadges();
    } else {
      console.log('🔔 [BADGES] No user ID, skipping badge load');
    }
  }, [user?.id]);

  // FONCTION SIMPLIFIÉE POUR ÉVITER ERREURS
  const refreshBadges = useCallback(async () => {
    if (!user?.id) return;

    try {
      // APPROCHE SIMPLIFIÉE: Même logique que l'initialisation
      const { data: userConversations, error: conversationsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (conversationsError) {
        console.error('🔔 [BADGES] Refresh failed to get conversations:', conversationsError);
        setTotalUnreadMessages(0);
        return;
      }

      let finalCount = 0;

      if (!userConversations || userConversations.length === 0) {
        finalCount = 0;
      } else {
        const conversationIds = userConversations.map(cp => cp.conversation_id);

        const { count: msgCount, error: msgError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('read', false)
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id);

        if (msgError) {
          console.error('🔔 [BADGES] Refresh failed to count messages:', msgError);
          setTotalUnreadMessages(0);
          return;
        }

        finalCount = msgCount || 0;
      }

      setTotalUnreadMessages(finalCount);
      console.log('🔄 Badges refreshed:', finalCount);

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
