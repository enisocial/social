import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const useLiveChat = (streamId: string) => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['live-chat', streamId],
    queryFn: async () => {
      // Use Redis-cached edge function for better performance
      const { data: response, error } = await supabase.functions.invoke('cached-live-chat', {
        body: { streamId }
      });

      if (error) throw error;
      return response.messages as ChatMessage[];
    },
    enabled: !!streamId,
    staleTime: 10000, // 10 seconds client-side cache
    refetchOnWindowFocus: false,
  });

  // Subscribe to new messages
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-chat-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Modération automatique
      const moderationResponse = await supabase.functions.invoke('moderate-chat', {
        body: {
          message,
          userId: user.id,
          streamId,
        },
      });

      if (moderationResponse.error) {
        console.error('Moderation error:', moderationResponse.error);
        throw new Error('Erreur de modération');
      }

      const { approved, violations } = moderationResponse.data;

      if (!approved) {
        throw new Error(`Message rejeté: ${violations.join(', ')}`);
      }

      const { error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          message,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
    },
    onError: (error: Error) => {
      console.error('Send message error:', error);
    },
  });

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
