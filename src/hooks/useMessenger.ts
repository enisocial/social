import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { debounce, throttle } from '@/utils/performance';
import { checkRateLimit } from '@/utils/rate-limit.utils';
import { performanceMonitor, errorTracker } from '@/utils/monitoring.utils';

import { cacheService, CACHE_KEYS, callSupabaseEdgeFunction } from '@/services/cache.service';

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
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceState>({ online: false, typing: false });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const otherUserIdRef = useRef<string | null>(null);

  // --- ULTRA FAST MESSAGES LOAD ---
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);

    // STRATÉGIE ULTRA-RAPIDE: Cache agressif d'abord
    const cacheKey = `ultra-fast-messages-${conversationId}`;
    const cachedMessages = cacheService.get<Message[]>(cacheKey);

    if (cachedMessages) {
      setMessages(cachedMessages);
      setLoading(false);
      return;
    }

    try {
      await performanceMonitor.measureAsync('fetchMessages', async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // REQUÊTE ULTRA-OPTIMISÉE: Une seule requête avec toutes les jointures
        const { data: rawMessages, error: msgError } = await supabase
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
          .limit(50);

        if (msgError) {
          console.error('❌ Messages query error:', msgError);
          setMessages([]);
          return;
        }

        if (!rawMessages || rawMessages.length === 0) {
          const emptyMessages: Message[] = [];
          cacheService.set(cacheKey, emptyMessages, 30 * 1000); // Cache 30 secondes
          setMessages(emptyMessages);
          return;
        }

        // TRANSFORMATION ULTRA-RAPIDE des données
        const messages: Message[] = rawMessages.map((msg: any) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          read: msg.read || false,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          attachment_name: msg.attachment_name,
          reply_to: msg.reply_to,
          edited: msg.edited || false,
          reactions: msg.reactions,
          pinned_by: msg.pinned_by,
          pinned_at: msg.pinned_at,
          sender: msg.sender || {
            id: msg.sender_id,
            name: 'Unknown',
            username: '',
            avatar_url: null
          },
          status: msg.status
        }));

        // CACHE ULTRA-AGRESSIF: 2 minutes pour éviter les rechargements
        cacheService.set(cacheKey, messages, 2 * 60 * 1000);

        setMessages(messages);

      }, { conversationId });
    } catch (err) {
      console.error('🚨 ULTRA FAST MESSAGES FAILED:', err);
      errorTracker.track(err as Error, { context: 'fetchMessages', conversationId });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // CHARGER LA PRÉSENCE INITIALE DE L'AUTRE UTILISATEUR
  const loadOtherUserPresence = useCallback(async (otherUserId: string) => {
    try {
      const { data: presence } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', otherUserId)
        .single();

      if (presence) {
        setOtherUserPresence(prev => ({
          ...prev,
          online: (presence as any).is_online || false
        }));
      }
    } catch (error) {
      console.error('Erreur chargement présence:', error);
    }
  }, []);

  // --- Setup Realtime subscription ---
  const setupRealtime = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !conversationId) return;

    // Presence: mark user online
    try {
      await supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_online: true
      });
    } catch (error) {
      console.error('Failed to mark user online:', error);
    }

    // Get other user ID
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .limit(1)
      .single();

    const otherUserId = participant?.user_id;

    // Stocker l'ID pour les fonctions de nettoyage
    otherUserIdRef.current = otherUserId;

    if (otherUserId) {
      // Charger la présence initiale
      await loadOtherUserPresence(otherUserId);

      // ÉCOUTER LES CHANGEMENTS DE PRÉSENCE DANS LA TABLE user_presence
      // Cela permet de synchroniser avec les déconnexions complètes
      const presenceChannel = supabase
        .channel(`presence-sync-${conversationId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${otherUserId}`
        }, (payload) => {
          const presence = payload.new as any;
          if (presence) {
            const isOnline = presence.is_online || false;
            setOtherUserPresence(prev => ({
              ...prev,
              online: isOnline
            }));
          }
        })
        .subscribe();
    }

    // Subscribe to messages
    const channel = supabase.channel(`conversation-${conversationId}`, { config: { broadcast: { self: false }, presence: { key: user.id } } });

    // New message
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const newMsg = payload.new as Message;
      setMessages(prev => {
        // Deduplication logic:
        // 1. Check if we already have this exact ID (classic dup)
        if (prev.some(m => m.id === newMsg.id)) return prev;
        
        // 2. Check if we have a temp message that matches this real one
        // We can match by content + timestamp proximity + sender_id
        // Or simpler: rely on the sendMessage updating the temp ID to real ID before this event fires
        // But if race condition happens (Realtime arrives BEFORE sendMessage insert resolves),
        // we might have both.
        
        // Strategy: We won't try fuzzy matching here to avoid false positives.
        // Instead, we rely on the fact that sendMessage updates the ID in-place.
        // If Realtime arrives first, we add it. 
        // When sendMessage resolves, it updates the temp ID to the real ID.
        // Then React reconciliation might show duplicates if we are not careful.
        
        // Robust fix:
        // Use a 'client_side_id' column if possible, but schema changes are heavy.
        // Alternative: Check if there is a temp message with same content/sender created < 2 sec ago
        const now = new Date(newMsg.created_at).getTime();
        const duplicateTemp = prev.find(m => 
          m.id.startsWith('temp-') && 
          m.content === newMsg.content && 
          m.sender_id === newMsg.sender_id &&
          Math.abs(new Date(m.created_at).getTime() - now) < 5000
        );

        if (duplicateTemp) {
          // Replace the temp message with the real one
          return prev.map(m => m.id === duplicateTemp.id ? newMsg : m);
        }

        return [...prev, newMsg];
      });
    });

    // Update message
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const updated = payload.new as Message;
      setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    });

    // Typing indicator
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload as any;
      if (data.userId === otherUserId) {
        setOtherUserPresence(prev => ({ ...prev, typing: data.typing }));
      }
    });

    // Presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOtherUserPresence(prev => ({ ...prev, online: !!state[otherUserId] }));
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === otherUserId) setOtherUserPresence(prev => ({ ...prev, online: true }));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === otherUserId) setOtherUserPresence(prev => ({ ...prev, online: false }));
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;
  }, [conversationId]);

  // ÉCOUTER LES CHANGEMENTS D'AUTHENTIFICATION POUR NETTOYER LES ABONNEMENTS
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // UNIQUEMENT nettoyer lors d'une vraie déconnexion, pas lors d'autres changements
      if (event === 'SIGNED_OUT') {
        console.log('🚪 [LOGOUT] User signed out, forcing presence update immediately');

        // FORCER IMMÉDIATEMENT la mise à jour du statut de présence
        // Les autres utilisateurs verront le changement via les canaux globaux
        setOtherUserPresence({ online: false, typing: false });

        // Vérification AGRESSIVE du statut de présence (toutes les 2 secondes pendant 30 secondes)
        let checkCount = 0;
        const aggressivePresenceCheck = setInterval(async () => {
          try {
            checkCount++;
            if (otherUserIdRef.current) {
              const { data: presenceCheck } = await supabase
                .from('user_presence')
                .select('is_online, last_seen')
                .eq('user_id', otherUserIdRef.current)
                .single();

              if (presenceCheck) {
                const isOnline = (presenceCheck as any).is_online || false;
                console.log(`🔄 [LOGOUT] Aggressive presence check ${checkCount}:`, { userId: otherUserIdRef.current, isOnline });
                setOtherUserPresence(prev => ({
                  ...prev,
                  online: isOnline
                }));
              }
            }

            // Arrêter après 15 vérifications (30 secondes)
            if (checkCount >= 15) {
              clearInterval(aggressivePresenceCheck);
              console.log('✅ [LOGOUT] Aggressive presence checking stopped');
            }
          } catch (error) {
            console.error('Error in aggressive presence check:', error);
          }
        }, 2000); // Toutes les 2 secondes

        // Nettoyer après un délai pour permettre la propagation
        setTimeout(async () => {
          console.log('🧹 [LOGOUT] Starting cleanup after propagation delay');

          // 1. Nettoyer les abonnements
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }

          // 2. Nettoyer les timeouts
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }

          // 3. Nettoyer le cache des messages pour éviter les données obsolètes
          if (conversationId) {
            const cacheKey = `ultra-fast-messages-${conversationId}`;
            cacheService.delete(cacheKey);
          }

          console.log('✅ [LOGOUT] Cleanup completed');
        }, 1000); // Réduire à 1 seconde

        // Nettoyer l'intervalle quand l'effet se termine
        return () => {
          clearInterval(aggressivePresenceCheck);
        };

      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  // ÉCOUTER LES CHANGEMENTS GLOBAUX DE PRÉSENCE POUR SYNCHRONISATION TEMPS RÉEL
  useEffect(() => {
    if (!conversationId || !otherUserIdRef.current) return;

    console.log('🌐 Setting up global presence listener for user:', otherUserIdRef.current);

    const globalPresenceChannel = supabase
      .channel(`global-presence-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${otherUserIdRef.current}`
      }, (payload) => {
        const presence = payload.new as any;
        if (presence) {
          const isOnline = presence.is_online || false;
          console.log('🔄 Global presence update received:', { userId: otherUserIdRef.current, isOnline });
          setOtherUserPresence(prev => ({
            ...prev,
            online: isOnline
          }));
        }
      })
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up global presence listener');
      supabase.removeChannel(globalPresenceChannel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();
    setupRealtime();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  // METTRE À JOUR LE CACHE APRÈS L'ENVOI RÉUSSI D'UN MESSAGE
  // Cela garantit que les nouveaux messages sont sauvegardés
  const prevSendingRef = useRef(sending);
  useEffect(() => {
    // Détecter quand sending passe de true à false (envoi terminé)
    if (prevSendingRef.current && !sending && conversationId) {
      const cacheKey = `ultra-fast-messages-${conversationId}`;
      const realMessages = messages.filter(m => !m.id.startsWith('temp-'));
      if (realMessages.length > 0) {
        cacheService.set(cacheKey, realMessages, 2 * 60 * 1000);
      }
    }
    prevSendingRef.current = sending;
  }, [sending, messages, conversationId]);



  // --- Send message with optimistic update ---
  const sendMessage = useCallback(async (content: string, attachment?: { url: string; type: string; name: string }, replyToId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Pas d\'utilisateur authentifié');
      return;
    }
    if (!conversationId) {
      console.error('Pas d\'ID de conversation');
      return;
    }

    setSending(true);

    if (!checkRateLimit('message')) {
      toast.error('Vous envoyez trop de messages. Veuillez patienter quelques instants.');
      setSending(false);
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimistic: Message = {
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
      sender: { id: user.id, name: 'Vous', username: '', avatar_url: null }
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      const { data: newMsg, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
        attachment_name: attachment?.name,
        reply_to: replyToId
      }).select('id, created_at').single();

      if (error) {
        console.error('Supabase Insert Error:', error);
        // Check for specific error codes
        if (error.code === '23503') { // Foreign key violation
           throw new Error('Conversation invalide ou introuvable');
        }
        
        // Check for plan limits/read-only mode in message, details, or hint
        const errorString = `${error.message} ${error.details} ${error.hint}`.toLowerCase();
        if (
          error.code === '53100' || 
          error.code === '53200' || 
          errorString.includes('read-only transaction') || 
          errorString.includes('exceeding your plans') ||
          errorString.includes('disk full')
        ) {
           throw new Error('Limite de stockage atteinte. Veuillez contacter l\'administrateur ou mettre à niveau le plan.');
        }
        
        throw error;
      }

      // Update temp message with real ID
      setMessages(prev => prev.map(m => m.id === tempId ? { ...optimistic, id: newMsg.id, created_at: newMsg.created_at } : m));
      
    } catch (err: any) {
      console.error('Send message detailed error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      const errorMessage = err.message || 'Erreur inconnue';
      if (errorMessage.includes('Conversation invalide')) {
        // Clear cache to force refresh next time
        cacheService.clear(); // Drastic but effective for fixing stuck states
        toast.error('Erreur de conversation. Veuillez rafraîchir la page.');
      } else if (errorMessage.includes('Limite de stockage') || errorMessage.includes('plans')) {
        toast.error(errorMessage);
      } else {
        // Show specific error for debugging
        toast.error(`Erreur lors de l'envoi du message : ${errorMessage}`);
      }
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  const setTyping = useRef(throttle(async (typing: boolean) => {
    if (!channelRef.current) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Prevent "Realtime send() fallback" warning by ensuring channel is connected
    if (channelRef.current.state !== 'joined') return;

    try {
      await channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, typing } });
    } catch {}
  }, 1500)).current;

  const editMessage = async (id: string, content: string) => {
    const { error } = await supabase.from('messages').update({ content, edited: true }).eq('id', id);
    if (error) toast.error('Erreur modification message');
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) toast.error('Erreur suppression message');
  };

  const pinMessage = async (id: string, currentlyPinned: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('messages').update({
      pinned_by: currentlyPinned ? null : user.id,
      pinned_at: currentlyPinned ? null : new Date().toISOString()
    }).eq('id', id);
    if (error) toast.error('Erreur épinglage');
  };

  const markAsRead = async (ids: string[]) => {
    if (!ids.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('mark_messages_as_read', { p_user_id: user.id, p_message_ids: ids });
  };

  return {
    messages,
    loading,
    sending,
    otherUserPresence,
    sendMessage,
    setTyping,
    editMessage,
    deleteMessage,
    pinMessage,
    markAsRead,
    refetch: fetchMessages
  };
};
