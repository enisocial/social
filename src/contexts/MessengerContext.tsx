import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/contexts/UnreadContext';

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
  // useUnreadMessages is now a simple consumer of UnreadContext, no arguments needed
  const { optimisticReset } = useUnreadMessages();

  const pendingResets = useRef<Set<string>>(new Set());
  const resetTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load bubbles and auth state
  useEffect(() => {
    const loadBubbles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setCurrentUserId(null);

      setCurrentUserId(user.id);

      try {
        const saved = localStorage.getItem(`messenger_bubbles_${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Filter out invalid bubbles (temp IDs or malformed)
          const validBubbles = parsed.filter((b: ChatBubble) => 
            b.conversationId && 
            !b.conversationId.startsWith('temp_') && 
            !b.conversationId.startsWith('temp-') &&
            // Simple UUID check (length is 36)
            b.conversationId.length === 36
          );
          
          // Force minimize on restore to prevent full-screen takeover on mobile login
          const minimized = validBubbles.map((b: ChatBubble) => ({ ...b, isMinimized: true }));
          setBubbles(minimized);
        }
      } catch (err) {
        console.error('Error loading bubbles:', err);
        setBubbles([]);
      }
    };

    loadBubbles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
        setBubbles([]);
      } else if (event === 'SIGNED_IN') {
        loadBubbles();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist bubbles
  useEffect(() => {
    if (!currentUserId) return;
    if (bubbles.length) localStorage.setItem(`messenger_bubbles_${currentUserId}`, JSON.stringify(bubbles));
    else localStorage.removeItem(`messenger_bubbles_${currentUserId}`);
  }, [bubbles, currentUserId]);

  const scheduleUnreadReset = (conversationId: string) => {
    if (!currentUserId) return;
    
    // If already pending, don't schedule another one immediately
    // The existing timeout will handle it
    if (pendingResets.current.has(conversationId)) return;
    
    pendingResets.current.add(conversationId);

    // Clear any existing timeout just in case (though the check above handles most cases)
    const existingTimeout = resetTimeouts.current.get(conversationId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(async () => {
      try {
        await supabase.rpc('force_reset_unread_count', { 
          p_user_id: currentUserId, 
          p_conversation_id: conversationId 
        });
      } catch (err) {
        console.error('Error resetting unread count:', err);
      } finally {
        pendingResets.current.delete(conversationId);
        resetTimeouts.current.delete(conversationId);
      }
    }, 1000); // Increased debounce time slightly to catch rapid open/close/reads

    resetTimeouts.current.set(conversationId, timeout);
  };

  // Open a bubble
  const openBubble = async (conversationId: string, otherUser: ChatBubble['otherUser']) => {
    if (!currentUserId) return;

    optimisticReset(conversationId);

    setBubbles(prev => {
      const existing = prev.find(b => b.conversationId === conversationId);
      if (existing) {
        return prev.map(b => b.conversationId === conversationId ? { ...b, isMinimized: false, unreadCount: 0 } : b);
      }
      return [...prev, { conversationId, otherUser, isMinimized: false, unreadCount: 0 }].slice(-3);
    });

    scheduleUnreadReset(conversationId);
  };

  const closeBubble = (conversationId: string) => setBubbles(prev => prev.filter(b => b.conversationId !== conversationId));

  const toggleMinimize = (conversationId: string) => {
    setBubbles(prev => prev.map(b => b.conversationId === conversationId ? { ...b, isMinimized: !b.isMinimized } : b));
  };

  const updateUnreadCount = (conversationId: string, count: number) => {
    setBubbles(prev => prev.map(b => b.conversationId === conversationId ? { ...b, unreadCount: count } : b));
  };

  const clearUnread = async (conversationId: string) => {
    if (!currentUserId) return;
    optimisticReset(conversationId);
    setBubbles(prev => prev.map(b => b.conversationId === conversationId ? { ...b, unreadCount: 0 } : b));
    scheduleUnreadReset(conversationId);
  };

  return (
    <MessengerContext.Provider value={{ bubbles, openBubble, closeBubble, toggleMinimize, updateUnreadCount, clearUnread }}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) throw new Error('useMessenger must be used within MessengerProvider');
  return context;
};
