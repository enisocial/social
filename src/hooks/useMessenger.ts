import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { debounce, throttle } from '@/utils/performance';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  reply_to?: string | null;
  edited?: boolean;
  reactions?: any;
  pinned_by?: string | null;
  pinned_at?: string | null;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  status?: {
    delivered_at?: string;
    read_at?: string;
  };
}

interface PresenceState {
  online: boolean;
  typing: boolean;
}

export const useMessenger = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceState>({
    online: false,
    typing: false
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Single optimized query with all joins
      const [messagesResult, statusResult] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id (
              id,
              name,
              username,
              avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100), // Limit pour performance
        
        // Get status in parallel
        supabase
          .from('message_status')
          .select('message_id, delivered_at, read_at')
          .eq('user_id', user.id)
      ]);

      if (messagesResult.error) throw messagesResult.error;

      const messageIds = messagesResult.data?.map(m => m.id) || [];
      const relevantStatus = statusResult.data?.filter(s => messageIds.includes(s.message_id)) || [];
      const statusMap = new Map(relevantStatus.map(s => [s.message_id, s]));

      const enrichedMessages = messagesResult.data?.map(msg => ({
        ...msg,
        status: statusMap.get(msg.id)
      })) || [];

      setMessages(enrichedMessages as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const setupRealtimeSubscription = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !conversationId) return;

    // Update presence in database
    await supabase.rpc('update_user_presence', {
      p_user_id: user.id,
      p_online: true
    });

    // Get other user ID (une seule requête optimisée)
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .limit(1)
      .single();

    const otherUserId = participants?.user_id;

    // Canal unique optimisé avec moins de subscriptions
    const channel = supabase.channel(`conv:${conversationId}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } }
    });

    // Subscribe to new messages - with duplicate prevention
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const newMsg = payload.new as any;
        
        // CRITICAL: Check if message already exists (prevent duplicates from optimistic updates)
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMsg.id);
          if (exists) {
            return prev; // Already have it, skip
          }
          
          // Fetch sender info only if not in cache
          const cachedSender = prev.find(m => m.sender_id === newMsg.sender_id)?.sender;
          
          if (cachedSender) {
            return [...prev, {
              ...newMsg,
              sender: cachedSender
            } as Message];
          }
          
          // If no cached sender, add without sender first for instant display
          // Then fetch sender in background
          supabase
            .from('profiles')
            .select('id, name, username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()
            .then(({ data }) => {
              if (data) {
                setMessages(current => current.map(m =>
                  m.id === newMsg.id ? { ...m, sender: data } : m
                ));
              }
            });
          
          return [...prev, {
            ...newMsg,
            sender: { id: newMsg.sender_id, name: 'Chargement...', username: '', avatar_url: null }
          } as Message];
        });
      }
    );

    // Subscribe to message updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => 
          m.id === updated.id ? { ...m, ...updated } : m
        ));
      }
    );

    // Listen for typing events
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload as any;
      if (data.userId === otherUserId) {
        setOtherUserPresence(prev => ({
          ...prev,
          typing: data.typing || false
        }));
      }
    });

    // Track online presence via presence state
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const isOtherUserOnline = otherUserId && state[otherUserId];
      setOtherUserPresence(prev => ({
        ...prev,
        online: !!isOtherUserOnline
      }));
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === otherUserId) {
        setOtherUserPresence(prev => ({
          ...prev,
          online: true
        }));
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === otherUserId) {
        setOtherUserPresence(prev => ({
          ...prev,
          online: false
        }));
      }
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence when subscribed
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString()
        });
      }
    });

    channelRef.current = channel;
  }, [conversationId]);

  const sendMessage = useCallback(async (
    content: string,
    attachment?: {
      url: string;
      type: string;
      name: string;
    },
    replyToId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      if (!conversationId) {
        console.error('No conversation ID');
        toast.error('Conversation non trouvée');
        return;
      }

      setSending(true);

      // Get cached sender info
      const cachedSender = messages.find(m => m.sender_id === user.id)?.sender;
      
      // Create optimistic message - INSTANT display
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
        read: false,
        edited: false,
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
        reply_to: replyToId || null,
        pinned_at: null,
        pinned_by: null,
        reactions: null,
        sender: cachedSender || { id: user.id, name: 'Vous', username: '', avatar_url: null }
      };

      // Add optimistic message IMMEDIATELY for instant feedback
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send to database in background (non-blocking)
      const { data: newMessage, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
        attachment_name: attachment?.name,
        reply_to: replyToId
      }).select('id, created_at').single();

      if (error) throw error;

      // Replace optimistic with real ID immediately (realtime will skip duplicate)
      if (newMessage) {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...optimisticMessage, id: newMessage.id, created_at: newMessage.created_at } : m
        ));
      }

      // Stop typing indicator - FIXED: Use broadcast correctly
      if (channelRef.current) {
        try {
          // Use broadcast with proper event structure
          await channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, typing: false }
          });
        } catch (error) {
          console.error('Error updating typing status:', error);
        }
      }

      setSending(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.toString().startsWith('temp-')));
      setSending(false);
    }
  }, [conversationId, messages]);

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          edited: true
        })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message modifié');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const pinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .update({
          pinned_by: isPinned ? null : user.id,
          pinned_at: isPinned ? null : new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      toast.success(isPinned ? 'Message désépinglé' : 'Message épinglé');
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Erreur lors de l\'épinglage');
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the new SQL function to mark messages as read and update counters
      await supabase.rpc('mark_messages_as_read', {
        p_user_id: user.id,
        p_message_ids: messageIds
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // OPTIMIZED: Typing indicator throttled - accepts deprecation for now
  // TODO: Migrate to database-based typing_status table when created
  const setTypingThrottled = useRef(
    throttle(async (typing: boolean) => {
      if (!channelRef.current || !conversationId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Using broadcast - accepts deprecation warning for now
        // This is a non-critical feature, REST fallback is acceptable
        await channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id, typing }
        });
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }, 2000) // Throttle to max once per 2 seconds
  ).current;

  const setTyping = (typing: boolean) => {
    setTypingThrottled(typing);
  };

  return {
    messages,
    loading,
    sending,
    otherUserPresence,
    sendMessage,
    markAsRead,
    setTyping,
    editMessage,
    deleteMessage,
    pinMessage,
    refetch: fetchMessages
  };
};
