import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface ChatBubble {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  isMinimized: boolean;
  unreadCount: number;
}

interface MessengerContextType {
  bubbles: ChatBubble[];
  openBubble: (conversationId: string, otherUser: ChatBubble['otherUser']) => void;
  closeBubble: (conversationId: string) => void;
  toggleMinimize: (conversationId: string) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
  clearUnread: (conversationId: string) => void;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { optimisticReset } = useUnreadMessages(currentUserId);
  
  // OPTIMIZATION: Prevent duplicate reset calls with debouncing
  const pendingResets = useRef<Set<string>>(new Set());
  const resetTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load bubbles for current user
  useEffect(() => {
    const loadBubbles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        try {
          const saved = localStorage.getItem(`messenger_bubbles_${user.id}`);
          if (saved) {
            setBubbles(JSON.parse(saved));
          }
        } catch (error) {
          console.error('Error loading bubbles:', error);
          setBubbles([]);
        }
      } else {
        setCurrentUserId(null);
        setBubbles([]);
      }
    };

    loadBubbles();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
        setBubbles([]);
      } else if (event === 'SIGNED_IN') {
        loadBubbles();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save bubbles to localStorage whenever they change
  useEffect(() => {
    if (currentUserId) {
      if (bubbles.length > 0) {
        localStorage.setItem(`messenger_bubbles_${currentUserId}`, JSON.stringify(bubbles));
      } else {
        // Clear localStorage when no bubbles remain
        localStorage.removeItem(`messenger_bubbles_${currentUserId}`);
      }
    }
  }, [bubbles, currentUserId]);

  const openBubble = async (conversationId: string, otherUser: ChatBubble['otherUser']) => {
    if (!currentUserId) return;

    // OPTIMIZATION: Prevent duplicate calls
    if (pendingResets.current.has(conversationId)) {
      console.log('[OPTIMIZED] Skipping duplicate reset for', conversationId);
      return;
    }

    pendingResets.current.add(conversationId);

    // 1. Mise à jour optimiste du hook centralisé
    optimisticReset(conversationId);

    // 2. Mettre à jour l'état local des bubbles immédiatement
    setBubbles(prev => {
      const existingIndex = prev.findIndex(b => b.conversationId === conversationId);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          isMinimized: false,
          unreadCount: 0
        };
        return updated;
      }
      
      const newBubble: ChatBubble = {
        conversationId,
        otherUser,
        isMinimized: false,
        unreadCount: 0
      };
      
      const newBubbles = [...prev, newBubble];
      return newBubbles.slice(-3);
    });

    // 3. Reset en base de données (async) - DEBOUNCED
    // Clear any existing timeout for this conversation
    const existingTimeout = resetTimeouts.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout - batch resets within 500ms window
    const timeout = setTimeout(async () => {
      try {
        await supabase.rpc('force_reset_unread_count', {
          p_user_id: currentUserId,
          p_conversation_id: conversationId
        });
        console.log('[OPTIMIZED] Reset executed for', conversationId);
      } catch (error) {
        console.error('Error resetting unread count:', error);
      } finally {
        pendingResets.current.delete(conversationId);
        resetTimeouts.current.delete(conversationId);
      }
    }, 500);

    resetTimeouts.current.set(conversationId, timeout);
  };

  const closeBubble = (conversationId: string) => {
    setBubbles(prev => prev.filter(b => b.conversationId !== conversationId));
  };

  const toggleMinimize = (conversationId: string) => {
    setBubbles(prev =>
      prev.map(b =>
        b.conversationId === conversationId
          ? { ...b, isMinimized: !b.isMinimized }
          : b
      )
    );
  };

  const updateUnreadCount = (conversationId: string, count: number) => {
    setBubbles(prev =>
      prev.map(b =>
        b.conversationId === conversationId
          ? { ...b, unreadCount: count }
          : b
      )
    );
  };

  const clearUnread = async (conversationId: string) => {
    if (!currentUserId) return;

    // 1. Mise à jour optimiste
    optimisticReset(conversationId);

    // 2. Mise à jour locale des bubbles
    setBubbles(prev =>
      prev.map(b =>
        b.conversationId === conversationId
          ? { ...b, unreadCount: 0 }
          : b
      )
    );

    // 3. Reset en base (async)
    try {
      await supabase.rpc('force_reset_unread_count', {
        p_user_id: currentUserId,
        p_conversation_id: conversationId
      });
    } catch (error) {
      console.error('Error clearing unread count:', error);
    }
  };

  return (
    <MessengerContext.Provider
      value={{
        bubbles,
        openBubble,
        closeBubble,
        toggleMinimize,
        updateUnreadCount,
        clearUnread
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within MessengerProvider');
  }
  return context;
};
