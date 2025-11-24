import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadData {
  totalUnread: number;
  conversationUnreads: Map<string, number>;
}

export const useUnreadMessages = (userId: string | null) => {
  const [unreadData, setUnreadData] = useState<UnreadData>({
    totalUnread: 0,
    conversationUnreads: new Map()
  });
  const [loading, setLoading] = useState(true);

  // Fetch initial unread counts using cached edge function
  const fetchUnreadCounts = useCallback(async () => {
    if (!userId) {
      setUnreadData({ totalUnread: 0, conversationUnreads: new Map() });
      setLoading(false);
      return;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke('cached-unread-messages', {
        body: {}
      });

      if (error) throw error;

      const conversationMap = new Map<string, number>();
      Object.entries(response.conversationUnreads || {}).forEach(([convId, count]) => {
        conversationMap.set(convId, count as number);
      });

      setUnreadData({
        totalUnread: response.totalUnread || 0,
        conversationUnreads: conversationMap
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Optimistic update for a conversation
  const optimisticReset = useCallback((conversationId: string) => {
    setUnreadData(prev => {
      const oldCount = prev.conversationUnreads.get(conversationId) || 0;
      const newMap = new Map(prev.conversationUnreads);
      newMap.set(conversationId, 0);
      
      return {
        totalUnread: Math.max(0, prev.totalUnread - oldCount),
        conversationUnreads: newMap
      };
    });
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newData = payload.new as { conversation_id: string; unread_count: number };
          
          setUnreadData(prev => {
            const oldCount = prev.conversationUnreads.get(newData.conversation_id) || 0;
            const newCount = newData.unread_count || 0;
            const newMap = new Map(prev.conversationUnreads);
            newMap.set(newData.conversation_id, newCount);
            
            return {
              totalUnread: Math.max(0, prev.totalUnread - oldCount + newCount),
              conversationUnreads: newMap
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Nouvelle conversation créée, refetch
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCounts]);

  return {
    totalUnread: unreadData.totalUnread,
    conversationUnreads: unreadData.conversationUnreads,
    loading,
    optimisticReset,
    refetch: fetchUnreadCounts
  };
};
