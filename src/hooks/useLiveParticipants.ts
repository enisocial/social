import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface LiveParticipant {
  id: string;
  stream_id: string;
  user_id: string;
  role: 'host' | 'co-host' | 'guest';
  status: 'pending' | 'active' | 'declined' | 'removed';
  invited_by: string;
  invited_at: string;
  joined_at?: string;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const useLiveParticipants = (streamId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants, isLoading } = useQuery({
    queryKey: ['live-participants', streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_stream_participants')
        .select(`
          *,
          profiles!live_stream_participants_user_id_fkey (username, name, avatar_url)
        `)
        .eq('stream_id', streamId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as LiveParticipant[];
    },
    enabled: !!streamId,
  });

  // Subscribe to participant changes
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`participants-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_stream_participants',
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-participants', streamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  const inviteParticipant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'co-host' | 'guest' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('live_stream_participants')
        .insert({
          stream_id: streamId,
          user_id: userId,
          role,
          invited_by: user.id,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-participants', streamId] });
      toast({
        title: "Invitation envoyée",
        description: "L'utilisateur a été invité à rejoindre le live",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'inviter l'utilisateur",
        variant: "destructive",
      });
    },
  });

  const updateParticipantStatus = useMutation({
    mutationFn: async ({ participantId, status }: { participantId: string; status: 'active' | 'declined' }) => {
      const updates: any = { status };
      if (status === 'active') {
        updates.joined_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('live_stream_participants')
        .update(updates)
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-participants', streamId] });
    },
  });

  const removeParticipant = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from('live_stream_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-participants', streamId] });
      toast({
        title: "Participant retiré",
        description: "Le participant a été retiré du live",
      });
    },
  });

  return {
    participants,
    isLoading,
    inviteParticipant,
    updateParticipantStatus,
    removeParticipant,
  };
};