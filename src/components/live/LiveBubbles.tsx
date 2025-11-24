import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export const LiveBubbles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch active live streams from friends
  const { data: liveStreams } = useQuery({
    queryKey: ['live-bubbles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's friends
      const { data: friends } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map(f => 
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );

      // Get active live streams from friends
      const { data: streams } = await supabase
        .from('live_streams')
        .select(`
          id,
          title,
          viewer_count,
          user_id,
          profiles:user_id(username, name, avatar_url)
        `)
        .eq('status', 'live')
        .in('user_id', friendIds)
        .order('started_at', { ascending: false });

      return streams || [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Real-time subscription for new live streams (handled by query refetchInterval)

  if (!liveStreams || liveStreams.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Create Live Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/live')}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition-all group-hover:ring-4">
            <Plus className="w-8 h-8 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium text-foreground">Créer</span>
        </motion.button>

        {/* Live Stream Bubbles */}
        {liveStreams.map((stream: any) => (
          <motion.button
            key={stream.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/live/${stream.id}`)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 group relative"
          >
            {/* Live Indicator Ring */}
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-pink-500 blur-sm"
              />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 p-0.5 ring-2 ring-background">
                <Avatar className="w-full h-full">
                  <AvatarImage src={stream.profiles?.avatar_url} />
                  <AvatarFallback>
                    {stream.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Live Badge */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                LIVE
              </div>
            </div>

            {/* Username */}
            <span className="text-xs font-medium text-foreground max-w-[64px] truncate">
              {stream.profiles?.username || 'User'}
            </span>

            {/* Viewer Count */}
            {stream.viewer_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {stream.viewer_count} {stream.viewer_count === 1 ? 'vue' : 'vues'}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
