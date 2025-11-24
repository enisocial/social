import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const useLiveLikes = (streamId: string) => {
  const queryClient = useQueryClient();
  const [localLikeCount, setLocalLikeCount] = useState(0);

  // Get total likes count
  const { data: likesCount = 0 } = useQuery({
    queryKey: ['live-likes-count', streamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('live_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId)
        .eq('reaction_type', 'love');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!streamId,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Subscribe to new likes in realtime
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-likes-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_reactions',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          if (payload.new.reaction_type === 'love') {
            setLocalLikeCount(prev => prev + 1);
            queryClient.invalidateQueries({ queryKey: ['live-likes-count', streamId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  const addLike = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('live_reactions')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          reaction_type: 'love',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-likes-count', streamId] });
    },
  });

  return {
    likesCount: (likesCount || 0) + localLikeCount,
    addLike,
  };
};
