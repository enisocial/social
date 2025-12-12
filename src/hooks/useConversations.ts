import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  otherUser: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unreadCount: number;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    initUser();
    fetchConversations();

    // Subscribe uniquement aux nouveaux messages
    const channel = supabase
      .channel('conversations-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔄 Récupération directe des conversations...');

      // Récupérer d'abord les IDs des conversations où l'utilisateur est participant
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) {
        console.error('❌ Erreur récupération participants:', participantsError);
        throw participantsError;
      }

      if (!participantsData || participantsData.length === 0) {
        console.log('ℹ️ Aucune conversation trouvée');
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantsData.map(p => p.conversation_id);

      // Récupérer les conversations
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at, type')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur SQL conversations:', error);
        throw error;
      }

      // Pour chaque conversation, récupérer les détails (participants et dernier message)
      const transformedConversations = await Promise.all(
        conversationsData?.map(async (conv) => {
          // Récupérer les participants
          const { data: participants, error: partError } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles:user_id(id, name, username, avatar_url)
            `)
            .eq('conversation_id', conv.id);

          if (partError) {
            console.error('❌ Erreur participants pour conversation:', conv.id, partError);
          }

          // Trouver l'autre participant (pas l'utilisateur actuel)
          const otherParticipant = participants?.find(p => p.user_id !== user.id);

          // Récupérer le dernier message
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgError) {
            console.error('❌ Erreur messages pour conversation:', conv.id, msgError);
          }

          const lastMessage = messages && messages.length > 0 ? messages[0] : null;

          return {
            id: conv.id,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            otherUser: otherParticipant?.profiles ? {
              id: otherParticipant.profiles.id,
              name: otherParticipant.profiles.name,
              username: otherParticipant.profiles.username,
              avatar_url: otherParticipant.profiles.avatar_url
            } : {
              id: 'unknown',
              name: 'Utilisateur inconnu',
              username: 'unknown',
              avatar_url: null
            },
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at
            } : undefined,
            unreadCount: 0 // TODO: calculer les non lus
          };
        }) || []
      );

      console.log('✅ Conversations récupérées:', transformedConversations.length);
      setConversations(transformedConversations);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur récupération conversations:', error);
      setLoading(false);
    }
  };

  const createConversation = async (otherUserId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      // Use the database function to create or get existing conversation
      const { data, error } = await supabase.rpc(
        'create_conversation_with_participant',
        { other_user_id: otherUserId }
      );

      if (error) throw error;

      // Pas besoin de refetch, juste retourner l'ID
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
      return null;
    }
  };

  return {
    conversations,
    loading,
    createConversation,
    refetch: fetchConversations
  };
};
