import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface DuoInvitation {
  id: string;
  stream_id: string;
  host_id: string;
  guest_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
  invited_at: string;
  responded_at?: string;
  host: {
    name: string;
    avatar_url?: string;
  };
  guest: {
    name: string;
    avatar_url?: string;
  };
}

export const useLiveDuo = (streamId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch duo invitation for stream
  const { data: duoInvitation } = useQuery({
    queryKey: ['live-duo', streamId],
    queryFn: async () => {
      if (!streamId) return null;
      
      const { data, error } = await supabase
        .from('live_duo_invitations')
        .select(`
          *,
          host:host_id(name, avatar_url),
          guest:guest_id(name, avatar_url)
        `)
        .eq('stream_id', streamId)
        .in('status', ['pending', 'accepted'])
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DuoInvitation | null;
    },
    enabled: !!streamId,
  });

  // Subscribe to duo invitation changes
  useEffect(() => {
    if (!streamId) return;
    
    const channel = supabase
      .channel(`live-duo-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_duo_invitations',
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-duo', streamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  // Invite user to duo
  const inviteToDuo = useMutation({
    mutationFn: async (guestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('live_duo_invitations')
        .insert({
          stream_id: streamId,
          host_id: user.id,
          guest_id: guestId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update stream to duo mode
      await supabase
        .from('live_streams')
        .update({ is_duo: true, duo_guest_id: guestId })
        .eq('id', streamId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-duo', streamId] });
      toast({
        title: "Invitation envoyée",
        description: "L'utilisateur a été invité au live duo",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    },
  });

  // Respond to duo invitation
  const respondToDuo = useMutation({
    mutationFn: async ({ invitationId, accept }: { invitationId: string; accept: boolean }) => {
      const { error } = await supabase
        .from('live_duo_invitations')
        .update({
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-duo', streamId] });
      toast({
        title: variables.accept ? "Invitation acceptée" : "Invitation refusée",
        description: variables.accept 
          ? "Vous êtes maintenant en live duo !" 
          : "L'invitation a été refusée",
      });
    },
  });

  // End duo session
  const endDuo = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('live_duo_invitations')
        .update({ status: 'ended' })
        .eq('id', invitationId);

      if (error) throw error;

      // Update stream
      await supabase
        .from('live_streams')
        .update({ is_duo: false, duo_guest_id: null })
        .eq('id', streamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-duo', streamId] });
      toast({
        title: "Live duo terminé",
        description: "Le mode duo a été désactivé",
      });
    },
  });

  return {
    duoInvitation,
    inviteToDuo,
    respondToDuo,
    endDuo,
  };
};
