import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadData {
  totalUnread: number;
  conversationUnreads: Map<string, number>;
}

interface UnreadContextType {
  totalUnread: number;
  conversationUnreads: Map<string, number>;
  loading: boolean;
  optimisticReset: (conversationId: string) => void;
  optimisticUpdate: (conversationId: string, newCount: number) => void;
  refetch: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadData, setUnreadData] = useState<UnreadData>({
    totalUnread: 0,
    conversationUnreads: new Map()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const optimisticUpdate = useCallback((conversationId: string, newCount: number) => {
    setUnreadData(prev => {
      const oldCount = prev.conversationUnreads.get(conversationId) || 0;
      const newMap = new Map(prev.conversationUnreads);
      newMap.set(conversationId, newCount);
      
      return {
        totalUnread: Math.max(0, prev.totalUnread - oldCount + newCount),
        conversationUnreads: newMap
      };
    });
  }, []);

  // Setup Realtime subscription for unread updates
  useEffect(() => {
    if (!userId) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel(`unread-global-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (UPDATE, INSERT, DELETE)
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // If update, update the count
          if (payload.eventType === 'UPDATE') {
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
          // If insert (new conversation), refetch everything or add entry
          else if (payload.eventType === 'INSERT') {
             fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCounts]);

  return (
    <UnreadContext.Provider value={{
      totalUnread: unreadData.totalUnread,
      conversationUnreads: unreadData.conversationUnreads,
      loading,
      optimisticReset,
      optimisticUpdate,
      refetch: fetchUnreadCounts
    }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnreadMessages = () => {
  const context = useContext(UnreadContext);
  // If used outside provider (e.g. tests), return fallback or throw
  if (!context) {
    // Return dummy data if context is missing (safe fallback)
    return {
        totalUnread: 0,
        conversationUnreads: new Map(),
        loading: false,
        optimisticReset: () => {},
        optimisticUpdate: () => {},
        refetch: async () => {}
    };
  }
  return context;
};
