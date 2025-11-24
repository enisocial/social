import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TikTokLiveStream } from "@/components/live/TikTokLiveStream";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiveStreamDetail = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stream, isLoading, error: streamError } = useQuery({
    queryKey: ['live-stream', streamId],
    queryFn: async () => {
      console.log('Fetching stream with ID:', streamId);
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          profiles:user_id(username, name, avatar_url)
        `)
        .eq('id', streamId)
        .maybeSingle();

      if (error) {
        console.error('Stream fetch error:', error);
        throw error;
      }
      console.log('Stream data received:', data);
      return data as any;
    },
    enabled: !!streamId,
    retry: 3,
    retryDelay: 1000,
  });

  // Redirect if stream ended (but not if you're the broadcaster viewing stats)
  useEffect(() => {
    if (stream?.status === 'ended' && stream?.user_id !== user?.id) {
      navigate('/lives', { replace: true });
    }
  }, [stream?.status, stream?.user_id, user?.id, navigate]);

  // Subscribe to stream updates
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`stream-updates-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-stream', streamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  const handleStreamEnd = async () => {
    if (stream?.user_id === user?.id) {
      // Update stream status to ended
      await supabase
        .from('live_streams')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', streamId);
    }
    
    queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    navigate('/lives', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!stream || stream.status === 'ended') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <h2 className="text-2xl font-bold">Live introuvable ou terminé</h2>
          <Button onClick={() => navigate('/lives')}>
            Retour aux lives
          </Button>
        </div>
      </div>
    );
  }

  const isBroadcaster = user?.id === stream.user_id;

  return (
    <TikTokLiveStream
      streamId={streamId!}
      isBroadcaster={isBroadcaster}
      streamerInfo={{
        username: stream.profiles?.username || 'User',
        name: stream.profiles?.name || 'User',
        avatar_url: stream.profiles?.avatar_url,
      }}
      onEnd={handleStreamEnd}
    />
  );
};

export default LiveStreamDetail;
