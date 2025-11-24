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

      // Use Redis-cached edge function
      const { data: response, error } = await supabase.functions.invoke('cached-conversations', {
        body: {}
      });

      if (error) throw error;

      setConversations(response.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
