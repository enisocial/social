import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Image as ImageIcon, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useInstantMessaging } from '@/hooks/useInstantMessaging';
import { usePresence } from '@/hooks/usePresence';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

// HOOK SPÉCIAL POUR LA PRÉSENCE DANS LE MESSENGER (pas limité aux amis)
const useMessengerPresence = (userId: string) => {
  const [presence, setPresence] = useState<{
    is_online: boolean;
    last_seen: string | null;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('🔍 useMessengerPresence: Initializing for user:', userId);

    // Récupérer la présence initiale
    const fetchPresence = async () => {
      try {
        console.log('📡 Fetching presence for user:', userId);
        const response = await supabase
          .from('user_presence')
          .select('is_online, last_seen')
          .eq('user_id', userId)
          .single();

        console.log('📡 Presence response:', { error: response.error, data: response.data });

        if (response.error) {
          if (response.error.code === 'PGRST116') { // PGRST116 = not found
            console.log('⚠️ No presence record found for user:', userId);
            // User doesn't have presence record yet, set default
            setPresence({ is_online: false, last_seen: null });
          } else {
            console.error('❌ Erreur récupération présence:', response.error);
            setPresence({ is_online: false, last_seen: null });
          }
          return;
        }

        // Data is guaranteed to be present here if no error
        const presenceData = response.data;
        if (presenceData && typeof presenceData === 'object' && 'is_online' in presenceData && presenceData !== null) {
          console.log('✅ Presence data loaded:', presenceData);
          setPresence(presenceData as { is_online: boolean; last_seen: string | null });
        } else {
          console.log('⚠️ Invalid presence data format');
          setPresence({ is_online: false, last_seen: null });
        }
      } catch (error) {
        console.error('❌ Erreur fetch présence:', error);
        setPresence({ is_online: false, last_seen: null });
      }
    };

    fetchPresence();

    // S'abonner aux changements de présence
    console.log('📡 Subscribing to presence changes for user:', userId);
    const channel = supabase
      .channel(`presence_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 Presence change received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newPresence = payload.new as { is_online: boolean; last_seen: string };
            console.log('✅ Updating presence to:', newPresence);
            setPresence(newPresence);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('📡 Unsubscribing from presence changes for user:', userId);
      channel.unsubscribe();
    };
  }, [userId]);

  console.log('🔍 useMessengerPresence returning:', presence);
  return presence;
};

// HOOK POUR LE SYSTÈME DE TYPING INDICATOR EN TEMPS RÉEL
const useTypingIndicator = (conversationId: string, currentUserId: string) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Démarrer le typing
  const startTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;

    console.log('⌨️ Starting typing for conversation:', conversationId, 'user:', currentUserId);

    // Utiliser le canal de conversation pour le typing
    const channelName = `conversation_${conversationId}`;
    const channel = supabase.channel(channelName);

    console.log('📡 Broadcasting typing_start to channel:', channelName);

    // Envoyer l'événement de typing
    channel.send({
      type: 'broadcast',
      event: 'user_typing',
      payload: {
        userId: currentUserId,
        action: 'start'
      }
    }).then((result) => {
      console.log('📡 Typing broadcast result:', result);
    }).catch((error) => {
      console.error('📡 Typing broadcast error:', error);
    });

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Auto-stopping typing due to inactivity');
      stopTyping();
    }, 3000);
  }, [conversationId, currentUserId]);

  // Arrêter le typing
  const stopTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;

    console.log('⌨️ Stopping typing for conversation:', conversationId);

    // Utiliser le même canal de conversation
    const channelName = `conversation_${conversationId}`;
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'user_typing',
      payload: {
        userId: currentUserId,
        action: 'stop'
      }
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `conversation_${conversationId}`;
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        const { userId, action } = payload.payload;

        if (userId === currentUserId) return; // Ignorer ses propres événements

        if (action === 'start') {
          setTypingUsers(prev => new Set(prev).add(userId));
        } else if (action === 'stop') {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      })
      .subscribe();

    return () => {
      console.log('⌨️ Cleaning up typing indicator');
      channel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  return { typingUsers, startTyping, stopTyping };
};

// COMPOSANT POUR AFFICHER LE STATUT DE PRÉSENCE
const PresenceStatus: React.FC<{ userId: string }> = ({ userId }) => {
  const presence = useMessengerPresence(userId);

  if (!presence) {
    return <p className="text-xs text-gray-500">Chargement...</p>;
  }

  if (presence.is_online) {
    return <p className="text-xs text-green-600 font-medium">En ligne</p>;
  }

  if (presence.last_seen) {
    const lastSeenDate = new Date(presence.last_seen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));

    if (diffMinutes < 1) {
      return <p className="text-xs text-gray-500">Vu à l'instant</p>;
    } else if (diffMinutes < 60) {
      return <p className="text-xs text-gray-500">Vu il y a {diffMinutes} min</p>;
    } else if (diffMinutes < 1440) { // 24 heures
      const hours = Math.floor(diffMinutes / 60);
      return <p className="text-xs text-gray-500">Vu il y a {hours}h</p>;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return <p className="text-xs text-gray-500">Vu il y a {days}j</p>;
    }
  }

  return <p className="text-xs text-gray-500">Hors ligne</p>;
};

interface FacebookMessengerProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const FacebookMessenger: React.FC<FacebookMessengerProps> = React.memo(({
  conversationId,
  otherUser,
  isOpen,
  onClose
}) => {
  console.log('🎯 FacebookMessenger RENDER:', { conversationId, otherUser, isOpen });

  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<{
    file: File;
    preview: string;
    type: 'image' | 'video';
    uploading: boolean;
    uploadedUrl?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DETECTER SI ON EST SUR MOBILE
  const isMobile = useIsMobile();

  // UTILISER LE HOOK useInstantMessaging
  const { sendMessage: sendInstantMessage, markConversationAsRead } = useInstantMessaging();

  // UTILISER LE QUERY CLIENT POUR INVALIDER LE CACHE
  const queryClient = useQueryClient();

  // UTILISER LE HOOK TYPING INDICATOR
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversationId, user?.id || '');



  // UTILISER LE HOOK usePresence pour le statut en temps réel
  const { isUserOnline, getLastSeen } = usePresence();

  // ÉTAT POUR FORCER LE RERENDER QUAND LA PRÉSENCE CHANGE
  const [presenceUpdate, setPresenceUpdate] = useState(0);

  // FORCER LE RERENDER PÉRIODIQUEMENT POUR METTRE À JOUR LE STATUT
  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceUpdate(prev => prev + 1);
    }, 10000); // Toutes les 10 secondes

    return () => clearInterval(interval);
  }, []);

  // GESTION DU TYPING INDICATOR
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('⌨️ Input change:', { value, hasText: !!value.trim() });
    setNewMessage(value);

    // Démarrer le typing si l'utilisateur tape
    if (value.trim()) {
      console.log('⌨️ Calling startTyping...');
      startTyping();
    } else {
      console.log('⌨️ Calling stopTyping...');
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // ÉTAT LOCAL POUR LES MESSAGES (AVEC REALTIME)
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // FONCTION DE LOG POUR DÉBOGUER
  const addDebugLog = useCallback((message: string) => {
    console.log('🔍 DEBUG:', message);
    setDebugLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  // RÉCUPÉRER LES MESSAGES DE LA CONVERSATION - SANS CACHE POUR TEMPS RÉEL PUR
  const { data: messages = [], isLoading: loadingMessages, refetch } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      console.log('📨 Chargement messages pour conversation:', conversationId);

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          attachment_name,
          attachment_type,
          attachment_url,
          read,
          sender:profiles!messages_sender_id_fkey(id, name, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50); // RÉCUPÉRER LES 50 DERNIERS MESSAGES

      if (error) {
        console.error('❌ Erreur chargement messages:', error);
        throw error;
      }

      console.log('✅ Messages chargés (desc):', data?.length || 0);

      // REMETTRE DANS L'ORDRE CHRONOLOGIQUE (plus ancien au plus récent)
      const loadedMessages = data ? data.reverse() : [];
      return loadedMessages;
    },
    enabled: !!conversationId && isOpen,
    staleTime: 0, // PAS DE CACHE - RECHARGEMENT SYSTÉMATIQUE
    refetchOnMount: true, // RECHARGER QUAND LE COMPOSANT SE MONTE
    refetchOnWindowFocus: false, // NE PAS RECHARGER AU FOCUS DE LA FENÊTRE
    refetchOnReconnect: true, // RECHARGER APRÈS RECONNEXION
    gcTime: 0, // PAS DE CACHE PERSISTANT
  });

  // SYNCHRONISER LES MESSAGES LOCAUX AVEC LES DONNÉES REACT QUERY
  useEffect(() => {
    if (messages.length > 0) {
      console.log('🔄 Synchronisation avec React Query:', messages.length, 'messages en base');

      // CRÉER UN SET DES IDS DEPUIS LA BASE
      const dbMessageIds = new Set(messages.map(msg => msg.id));

      // FUSIONNER LES MESSAGES LOCAUX AVEC CEUX DE LA BASE
      setLocalMessages(prevLocalMessages => {
        // AJOUTER LES MESSAGES MANQUANTS DEPUIS LA BASE
        const missingFromDB = messages.filter(msg => !prevLocalMessages.some(local => local.id === msg.id));

        if (missingFromDB.length > 0) {
          console.log('� Ajout messages manquants depuis DB:', missingFromDB.length);
        }

        // GARDER TOUS LES MESSAGES LOCAUX (INCLUANT CEUX DU TEMPS RÉEL)
        // ET AJOUTER CEUX MANQUANTS DE LA DB
        const mergedMessages = [...prevLocalMessages, ...missingFromDB];

        // DÉDUPLIQUER ET TRIER
        const uniqueMessages = mergedMessages.filter((msg, index, arr) =>
          arr.findIndex(m => m.id === msg.id) === index
        ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        console.log('📝 État local final:', uniqueMessages.length, 'messages');
        return uniqueMessages;
      });
    }
  }, [messages]);

  // SYSTÈME REALTIME POUR LES NOUVEAUX MESSAGES
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    console.log('📡 Configuration realtime pour conversation:', conversationId);

    // S'ABONNER AUX NOUVEAUX MESSAGES DANS CETTE CONVERSATION
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('📨 Nouveau message reçu:', payload);

          // RÉCUPÉRER LES DÉTAILS COMPLETS DU MESSAGE (avec sender info)
          const { data: fullMessage, error } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender_id,
              attachment_name,
              attachment_type,
              attachment_url,
              read,
              sender:profiles!messages_sender_id_fkey(id, name, username, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('❌ Erreur récupération message complet:', error);
            return;
          }

          console.log('✅ Message complet ajouté:', fullMessage);

          // AJOUTER LE MESSAGE À L'ÉTAT LOCAL IMMÉDIATEMENT
          setLocalMessages(prevMessages => {
            // ÉVITER LES DOUBLONS
            const exists = prevMessages.some(msg => msg.id === fullMessage.id);
            if (exists) {
              console.log('⚠️ Message déjà présent (doublon évité):', fullMessage.id);
              return prevMessages;
            }

            const updatedMessages = [...prevMessages, fullMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            console.log('📝 État local mis à jour avec nouveau message temps réel:', fullMessage.id);
            return updatedMessages;
          });

          // MARQUER COMME LU SI C'EST UN MESSAGE DE L'AUTRE UTILISATEUR
          if (fullMessage.sender_id !== user?.id) {
            markConversationAsRead(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('📡 Désabonnement realtime pour conversation:', conversationId);
      channel.unsubscribe();
    };
  }, [conversationId, isOpen, user?.id, markConversationAsRead]);

  // SCROLL AUTOMATIQUE VERS LE BAS
  useEffect(() => {
    if (messagesEndRef.current && localMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // MARQUER LES MESSAGES COMME LUS
  useEffect(() => {
    if (conversationId && messages.length > 0 && isOpen) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, messages.length, isOpen, markConversationAsRead]);

  // UPLOAD DE FICHIER VERS SUPABASE STORAGE
  const uploadFile = useCallback(async (file: File): Promise<{ url: string; name: string }> => {
    console.log('🚀 Début upload fichier:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `chat-media/${fileName}`;

    console.log('📁 Upload vers:', { bucket: 'chat-media', path: filePath });

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erreur upload détaillée:', {
          message: uploadError.message,
          name: uploadError.name
        });

        // Essayer avec upsert si l'erreur est liée à un fichier existant
        if (uploadError.message?.includes('already exists') || uploadError.message?.includes('duplicate')) {
          console.log('🔄 Tentative avec upsert...');
          const { data: upsertData, error: upsertError } = await supabase.storage
            .from('chat-media')
            .update(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (upsertError) {
            console.error('❌ Erreur upsert:', upsertError);
            throw upsertError;
          }

          console.log('✅ Upload réussi avec upsert:', upsertData);
        } else {
          throw uploadError;
        }
      } else {
        console.log('✅ Upload réussi:', uploadData);
      }

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        const error = new Error('Failed to get public URL');
        console.error('❌ Erreur récupération URL:', error);
        throw error;
      }

      console.log('✅ URL publique obtenue:', urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        name: file.name
      };
    } catch (error) {
      console.error('❌ Erreur upload finale:', error);
      throw error;
    }
  }, []);

  // RESET DE L'ÉTAT APRÈS ENVOI RÉUSSI
  const resetAfterSend = useCallback(() => {
    setNewMessage('');
    setPendingMedia(null);
    setUploadProgress(0);
  }, []);

  // SUPPRESSION DU MÉDIA EN ATTENTE
  const removePendingMedia = useCallback(() => {
    if (pendingMedia?.preview) {
      URL.revokeObjectURL(pendingMedia.preview);
    }
    setPendingMedia(null);
    setUploadProgress(0);
  }, [pendingMedia]);

  // ENVOI DE MESSAGE AVEC OPTIMISTIC UPDATES
  const handleSendMessage = useCallback(async () => {
    console.log('🚀 handleSendMessage appelé', {
      pendingMedia: !!pendingMedia,
      uploadedUrl: pendingMedia?.uploadedUrl,
      uploading: pendingMedia?.uploading,
      newMessage: newMessage.trim(),
      sending
    });

    // Arrêter le typing quand on envoie un message
    stopTyping();

    // Si il y a un média uploadé et prêt, l'envoyer
    if (pendingMedia && pendingMedia.uploadedUrl && !pendingMedia.uploading) {
      console.log('📤 Envoi du message avec média uploadé');

      setSending(true);
      try {
        // OPTIMISTIC UPDATE : AJOUTER LE MESSAGE AVANT L'ENVOI
        const optimisticMessage = {
          id: `temp_${Date.now()}`, // ID temporaire
          content: newMessage.trim() || (pendingMedia.type === 'image' ? '📷 Image partagée' : '🎥 Vidéo partagée'),
          created_at: new Date().toISOString(),
          sender_id: user?.id,
          attachment_name: pendingMedia.file.name,
          attachment_type: pendingMedia.type,
          attachment_url: pendingMedia.uploadedUrl,
          read: true,
          sender: {
            id: user?.id,
            name: user?.user_metadata?.name || 'Moi',
            username: user?.user_metadata?.username || '',
            avatar_url: user?.user_metadata?.avatar_url
          }
        };

        // AJOUTER À L'ÉTAT LOCAL IMMÉDIATEMENT
        setLocalMessages(prevMessages => {
          const updatedMessages = [...prevMessages, optimisticMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          console.log('📝 Message optimiste ajouté:', optimisticMessage.id);
          return updatedMessages;
        });

        // ENVOYER LE MESSAGE
        const messageResult = await sendInstantMessage({
          conversationId,
          content: newMessage.trim() || (pendingMedia.type === 'image' ? '📷 Image partagée' : '🎥 Vidéo partagée'),
          attachment: {
            name: pendingMedia.file.name,
            type: pendingMedia.type,
            url: pendingMedia.uploadedUrl
          }
        });

        console.log('✅ Message avec média envoyé avec succès:', messageResult);

        // REMPLACER LE MESSAGE OPTIMISTE PAR LE RÉEL
        setLocalMessages(prevMessages => {
          return prevMessages.map(msg =>
            msg.id === optimisticMessage.id
              ? { ...msg, id: messageResult.id } // Remplacer l'ID temporaire
              : msg
          );
        });

        resetAfterSend();

      } catch (error) {
        console.error('❌ Erreur envoi message avec média:', error);
        // RETIRER LE MESSAGE OPTIMISTE EN CAS D'ERREUR
        setLocalMessages(prevMessages => {
          return prevMessages.filter(msg => msg.id !== `temp_${Date.now()}`);
        });
      } finally {
        setSending(false);
      }
      return;
    }

    // Sinon envoyer juste le texte (ou texte avec média pas encore uploadé)
    if ((!newMessage.trim() && !pendingMedia) || sending) {
      console.log('❌ Conditions non remplies pour envoi:', {
        hasText: !!newMessage.trim(),
        hasPendingMedia: !!pendingMedia,
        sending,
        uploading
      });
      return;
    }

    console.log('📝 Envoi message texte');

    setSending(true);
    try {
      // OPTIMISTIC UPDATE : AJOUTER LE MESSAGE AVANT L'ENVOI
      const optimisticMessage = {
        id: `temp_${Date.now()}`, // ID temporaire
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        sender_id: user?.id,
        attachment_name: null,
        attachment_type: null,
        attachment_url: null,
        read: true,
        sender: {
          id: user?.id,
          name: user?.user_metadata?.name || 'Moi',
          username: user?.user_metadata?.username || '',
          avatar_url: user?.user_metadata?.avatar_url
        }
      };

      // AJOUTER À L'ÉTAT LOCAL IMMÉDIATEMENT
      setLocalMessages(prevMessages => {
        const updatedMessages = [...prevMessages, optimisticMessage].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        console.log('📝 Message optimiste ajouté:', optimisticMessage.id);
        return updatedMessages;
      });

      // ENVOYER LE MESSAGE
      const messageResult = await sendInstantMessage({
        conversationId,
        content: newMessage.trim()
      });

      console.log('✅ Message texte envoyé avec succès:', messageResult);

      // REMPLACER LE MESSAGE OPTIMISTE PAR LE RÉEL
      setLocalMessages(prevMessages => {
        return prevMessages.map(msg =>
          msg.id === optimisticMessage.id
            ? { ...msg, id: messageResult.id } // Remplacer l'ID temporaire
            : msg
        );
      });

      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // RETIRER LE MESSAGE OPTIMISTE EN CAS D'ERREUR
      setLocalMessages(prevMessages => {
        return prevMessages.filter(msg => msg.id !== `temp_${Date.now()}`);
      });
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, sendInstantMessage, conversationId, pendingMedia, resetAfterSend, stopTyping, user]);

  // RACCOURCI CLAVIER ENTRÉE
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // GESTION SÉLECTION DE FICHIER - AFFICHAGE IMMÉDIAT + UPLOAD AUTO
  const handleFileSelect = useCallback(async (type: 'image' | 'video') => {
    console.log('📁 handleFileSelect appelé pour type:', type);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      console.log('📄 Fichier sélectionné:', file);

      if (file) {
        // Créer un aperçu immédiat
        const preview = URL.createObjectURL(file);
        console.log('👀 Aperçu créé:', preview);

        // Démarrer l'upload immédiatement
        setPendingMedia({
          file,
          preview,
          type,
          uploading: true
        });

        setUploading(true);
        setUploadProgress(0);

        console.log('🚀 Démarrage upload automatique...');

        try {
          // Simulation de progression
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const newProgress = prev + Math.random() * 30;
              return newProgress > 90 ? 90 : newProgress;
            });
          }, 200);

          const { url, name } = await uploadFile(file);

          clearInterval(progressInterval);
          setUploadProgress(100);

          console.log('✅ Upload terminé, média prêt à être envoyé');

          // Attendre un peu pour montrer la progression complète
          await new Promise(resolve => setTimeout(resolve, 500));

          // Mettre à jour l'état avec l'URL uploadée
          setPendingMedia(prev => prev ? {
            ...prev,
            uploading: false,
            uploadedUrl: url
          } : null);

        } catch (error) {
          console.error('❌ Erreur upload automatique:', error);
          setPendingMedia(prev => prev ? { ...prev, uploading: false } : null);
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }
    };
    input.click();
  }, [uploadFile]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={isMobile ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`fixed ${
          isMobile
            ? 'bottom-0 right-0 w-full h-full inset-0 border-0 rounded-none'
            : 'bottom-4 right-4 w-96 h-[500px] rounded-3xl border-8 border-red-500/80'
        } bg-gradient-to-br from-red-200 via-amber-200 to-yellow-200 dark:from-red-950 dark:via-amber-950 dark:to-yellow-950 shadow-2xl z-50 flex flex-col`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(239, 68, 68, 0.25) 0%, transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.25) 0%, transparent 45%),
            radial-gradient(circle at 70% 30%, rgba(245, 158, 11, 0.20) 0%, transparent 50%),
            radial-gradient(circle at 30% 70%, rgba(120, 53, 15, 0.20) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.12) 0%, transparent 65%)
          `,
          boxShadow: `
            0 40px 70px -12px rgba(239, 68, 68, 0.35),
            0 25px 35px -5px rgba(16, 185, 129, 0.15),
            0 0 0 4px rgba(239, 68, 68, 0.4),
            inset 0 3px 0 rgba(255, 255, 255, 0.2),
            0 0 40px rgba(239, 68, 68, 0.20)
          `
        }}
      >
        {/* HEADER AFRICAIN - RESPONSIVE MOBILE */}
        <div className={`flex items-center justify-between border-b border-amber-300/60 bg-gradient-to-r from-emerald-100/80 via-amber-100/80 to-teal-100/80 backdrop-blur-md rounded-t-3xl ${
          isMobile ? 'p-5 min-h-[80px]' : 'p-4'
        }`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className={isMobile ? "w-12 h-12" : "w-8 h-8"}>
              <AvatarImage src={otherUser.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {otherUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-gray-900 truncate ${
                isMobile ? 'text-lg' : 'text-sm'
              }`}>
                {otherUser.name}
              </h3>
              <PresenceStatus userId={otherUser.id} />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`hover:bg-blue-100 ${
              isMobile ? 'w-12 h-12 p-0' : 'w-8 h-8 p-0'
            }`}
            onClick={onClose}
          >
            <X className={isMobile ? "w-6 h-6 text-blue-600" : "w-4 h-4 text-blue-600"} />
          </Button>
        </div>



        {/* MESSAGES AREA - RESPONSIVE MOBILE */}
        <ScrollArea className={`flex-1 ${isMobile ? 'p-4' : 'p-3'} bg-gray-50`}>

          {(() => {
            console.log('🎨 RENDER DEBUG:', {
              localMessagesLength: localMessages.length,
              hasMessages: localMessages.length > 0,
              firstMessage: localMessages[0] ? {
                id: localMessages[0].id,
                content: localMessages[0].content?.substring(0, 50),
                sender_id: localMessages[0].sender_id,
                created_at: localMessages[0].created_at
              } : null
            });
            return localMessages.length === 0;
          })() ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`bg-blue-100 rounded-full flex items-center justify-center mb-3 ${
                isMobile ? 'w-20 h-20' : 'w-16 h-16'
              }`}>
                <MessageSquare className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} text-blue-600`} />
              </div>
              <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-600`}>
                {loadingMessages ? 'Chargement...' : `Commencez une conversation avec ${otherUser.name}`}
              </p>
            </div>
          ) : (
            <div className={`${isMobile ? 'space-y-4' : 'space-y-3'}`}>
              {(() => {
                console.log('🎨 MAPPING MESSAGES:', localMessages.map(m => ({ id: m.id, content: m.content?.substring(0, 30) })));
                return localMessages.map((message: any) => {
                  console.log('🎨 RENDERING MESSAGE:', { id: message.id, content: message.content?.substring(0, 30) });
                  const isOwnMessage = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] ${isMobile ? 'px-4 py-3' : 'px-3 py-2'} rounded-lg ${
                          isMobile ? 'text-base' : 'text-sm'
                        } ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white border-2 border-red-500/30'
                            : 'bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 text-gray-900 border-2 border-amber-300/60'
                        }`}
                      >
                        {/* AFFICHAGE DES PIÈCES JOINTES */}
                        {message.attachment_url && (
                          <div className="mb-2">
                            {message.attachment_type === 'image' ? (
                              <img
                                src={message.attachment_url}
                                alt={message.attachment_name || 'Image'}
                                className={`max-w-full h-auto rounded-lg cursor-pointer ${
                                  isMobile ? 'max-h-80' : 'max-h-64'
                                } object-cover`}
                                onClick={() => window.open(message.attachment_url, '_blank')}
                              />
                            ) : message.attachment_type === 'video' ? (
                              <video
                                src={message.attachment_url}
                                controls
                                className={`max-w-full h-auto rounded-lg ${
                                  isMobile ? 'max-h-80' : 'max-h-64'
                                }`}
                                preload="metadata"
                              />
                            ) : null}
                          </div>
                        )}

                        {/* TEXTE DU MESSAGE */}
                        <p className="break-words leading-relaxed">{message.content}</p>

                        {/* TIMESTAMP */}
                        <p className={`mt-1 ${
                          isMobile ? 'text-sm' : 'text-xs'
                        } ${
                          isOwnMessage ? 'text-red-200' : 'text-gray-500'
                        }`}>
                          {formatDistanceToNow(new Date(message.created_at), {
                            locale: fr,
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* TYPING INDICATOR */}
              {(() => {
                console.log('🎨 Rendering typing indicator:', { typingUsersSize: typingUsers.size, typingUsers: Array.from(typingUsers) });
                return typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-gray-500">
                          {typingUsers.size === 1 ? `${otherUser.name} écrit...` : 'Quelqu\'un écrit...'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* INPUT AREA - RESPONSIVE MOBILE */}
        <div className={`rounded-b-lg border-t border-gray-200 bg-white ${
          isMobile ? 'p-5 space-y-4 pb-safe-or-4' : 'p-3 space-y-2'
        }`}>
          {/* MÉDIA EN ATTENTE - MOBILE FRIENDLY */}
          {pendingMedia && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-4">
                {/* APERCU DU MEDIA */}
                <div className="flex-shrink-0">
                  {pendingMedia.type === 'image' ? (
                    <img
                      src={pendingMedia.preview}
                      alt="Aperçu"
                      className={isMobile ? "w-16 h-16 object-cover rounded-xl" : "w-12 h-12 object-cover rounded-lg"}
                    />
                  ) : (
                    <video
                      src={pendingMedia.preview}
                      className={isMobile ? "w-16 h-16 object-cover rounded-xl" : "w-12 h-12 object-cover rounded-lg"}
                      muted
                    />
                  )}
                </div>

                {/* INFOS ET CONTROLES */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-900 truncate font-medium`}>
                      {pendingMedia.type === 'image' ? '📷 Image' : '🎥 Vidéo'} • {pendingMedia.file.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removePendingMedia}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                      disabled={pendingMedia.uploading}
                    >
                      <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                    </Button>
                  </div>

                  {/* BARRE DE PROGRESSION */}
                  {pendingMedia.uploading && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-500 mt-2 font-medium`}>
                        Téléchargement... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BOUTONS MEDIA - MOBILE FRIENDLY */}
          <div className={`flex items-center ${isMobile ? 'gap-4' : 'gap-2'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFileSelect('image')}
              disabled={uploading || !!pendingMedia}
              className={`text-gray-500 hover:text-blue-600 rounded-2xl transition-all duration-200 ${
                isMobile ? 'p-4 w-14 h-14 hover:bg-blue-50' : 'p-2'
              }`}
            >
              <ImageIcon className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFileSelect('video')}
              disabled={uploading || !!pendingMedia}
              className={`text-gray-500 hover:text-blue-600 rounded-2xl transition-all duration-200 ${
                isMobile ? 'p-4 w-14 h-14 hover:bg-blue-50' : 'p-2'
              }`}
            >
              <Video className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
            </Button>
            {uploading && (
              <span className={`${isMobile ? 'text-sm px-3 py-2' : 'text-xs'} text-gray-500 animate-pulse font-medium bg-gray-100 rounded-full px-3 py-1`}>
                Upload...
              </span>
            )}
          </div>

          {/* INPUT TEXTE - MOBILE FRIENDLY */}
          <div className={`flex items-end ${isMobile ? 'gap-4' : 'gap-2'}`}>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={pendingMedia ? "Ajouter un message (optionnel)..." : "Tapez un message..."}
                className={`w-full border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-all duration-200 ${
                  isMobile
                    ? 'px-5 py-4 text-base min-h-[56px] placeholder:text-base'
                    : 'px-3 py-2 text-sm'
                }`}
                disabled={sending || uploading}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !pendingMedia) || sending || uploading}
              size="sm"
              className={`bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 active:scale-95 ${
                isMobile
                  ? 'px-6 py-4 min-h-[56px] text-base font-bold'
                  : 'px-4'
              }`}
            >
              {sending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isMobile && <span>ENVOI</span>}
                </div>
              ) : (
                <Send className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

FacebookMessenger.displayName = 'FacebookMessenger';

// Hook pour gérer les conversations ouvertes
export const useMessengerManager = () => {
  const [openConversations, setOpenConversations] = useState<Map<string, any>>(new Map());

  const openConversation = useCallback((conversationId: string, otherUser: any) => {
    setOpenConversations(prev => new Map(prev.set(conversationId, {
      otherUser,
      isOpen: true
    })));
  }, []);

  const closeConversation = useCallback((conversationId: string) => {
    setOpenConversations(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  const toggleConversation = useCallback((conversationId: string, otherUser: any) => {
    setOpenConversations(prev => {
      const existing = prev.get(conversationId);
      if (existing) {
        // Fermer si déjà ouverte
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      } else {
        // Ouvrir sinon
        return new Map(prev.set(conversationId, {
          otherUser,
          isOpen: true
        }));
      }
    });
  }, []);

  return {
    openConversations,
    openConversation,
    closeConversation,
    toggleConversation
  };
};
