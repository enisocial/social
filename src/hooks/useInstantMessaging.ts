import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface SendMessageOptions {
  conversationId: string;
  content: string;
  attachment?: {
    name: string;
    type: string;
    url: string;
  };
}

export const useInstantMessaging = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async ({
    conversationId,
    content,
    attachment
  }: SendMessageOptions) => {
    if (!user?.id || !content.trim()) return null;

    try {
      // Optimistic update - ajouter le message immédiatement dans l'UI
      const optimisticMessage = {
        id: `temp_${Date.now()}`, // ID temporaire
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
        attachment_url: attachment?.url || null,
        created_at: new Date().toISOString(),
        read: false,
        sender: {
          id: user.id,
          name: user.user_metadata?.name || 'Utilisateur',
          username: user.user_metadata?.username || '',
          avatar_url: user.user_metadata?.avatar_url || null
        }
      };

      // Mettre à jour le cache React Query immédiatement
      queryClient.setQueryData(
        ['conversation-messages', conversationId],
        (oldData: any) => {
          if (!oldData) return [optimisticMessage];
          return [...oldData, optimisticMessage];
        }
      );

      // Envoyer le message au serveur
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          attachment_name: attachment?.name || null,
          attachment_type: attachment?.type || null,
          attachment_url: attachment?.url || null,
          read: false
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, name, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Remplacer le message optimiste par le vrai message
      queryClient.setQueryData(
        ['conversation-messages', conversationId],
        (oldData: any) => {
          if (!oldData) return [message];
          return oldData.map((msg: any) =>
            msg.id === optimisticMessage.id ? message : msg
          );
        }
      );

      // Invalider les compteurs de messages non lus
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['online-friends-sidebar'] });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);

      // En cas d'erreur, supprimer le message optimiste
      queryClient.setQueryData(
        ['conversation-messages', conversationId],
        (oldData: any) => {
          if (!oldData) return [];
          return oldData.filter((msg: any) => msg.id !== `temp_${Date.now()}`);
        }
      );

      throw error;
    }
  }, [user?.id, queryClient]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Marquer tous les messages comme lus
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      // Mettre à jour le cache
      queryClient.setQueryData(
        ['conversation-messages', conversationId],
        (oldData: any) => {
          if (!oldData) return [];
          return oldData.map((msg: any) => ({
            ...msg,
            read: msg.sender_id !== user.id ? true : msg.read
          }));
        }
      );

      // Invalider les compteurs
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['online-friends-sidebar'] });

    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user?.id, queryClient]);

  const startTyping = useCallback((conversationId: string) => {
    // Pour l'instant, pas d'indicateur de frappe
    // TODO: Implémenter avec WebSocket ou table dédiée
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    // Pour l'instant, pas d'indicateur de frappe
    // TODO: Implémenter avec WebSocket ou table dédiée
  }, []);

  return {
    sendMessage,
    markConversationAsRead,
    startTyping,
    stopTyping
  };
};
