import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  stream_url?: string;
  status: 'upcoming' | 'live' | 'ended';
  viewer_count: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const useLiveStreams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streams, isLoading } = useQuery({
    queryKey: ['live-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          profiles!live_streams_user_id_fkey(username, name, avatar_url)
        `)
        .in('status', ['live', 'upcoming'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any as LiveStream[];
    },
    staleTime: 10 * 1000, // 10 secondes - mise à jour plus rapide des lives
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Refetch pour avoir le statut à jour
    refetchOnWindowFocus: true, // Refetch quand on revient sur la page
    retry: 1,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('live-streams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-streams'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createStream = useMutation({
    mutationFn: async (stream: {
      title: string;
      description?: string;
      thumbnail_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          ...stream,
          user_id: user.id,
          status: 'live',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      toast({
        title: "Stream créé",
        description: "Votre stream a été créé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le stream",
        variant: "destructive",
      });
    },
  });

  const updateStreamStatus = useMutation({
    mutationFn: async ({ streamId, status }: { streamId: string; status: 'live' | 'ended' }) => {
      const updates: any = { status };
      if (status === 'live') updates.started_at = new Date().toISOString();
      if (status === 'ended') updates.ended_at = new Date().toISOString();

      const { error } = await supabase
        .from('live_streams')
        .update(updates)
        .eq('id', streamId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider et forcer le refetch immédiat
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      queryClient.refetchQueries({ queryKey: ['live-streams'] });
    },
  });

  const deleteStream = useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('live_streams')
        .delete()
        .eq('id', streamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      toast({
        title: "Stream supprimé",
        description: "Le stream a été supprimé",
      });
    },
  });

  return {
    streams,
    isLoading,
    createStream,
    updateStreamStatus,
    deleteStream,
  };
};
