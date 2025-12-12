import { motion } from 'framer-motion';
import { X, Heart, Eye, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LiveStreamStatsProps {
  streamId: string;
  duration: number;
  onClose: () => void;
}

export const LiveStreamStats = ({ streamId, duration, onClose }: LiveStreamStatsProps) => {
  // Fetch stream stats
  const { data: stats } = useQuery({
    queryKey: ['stream-stats', streamId],
    queryFn: async () => {
      // Get likes count
      const { count: likesCount } = await supabase
        .from('live_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId)
        .eq('reaction_type', 'love');

      // Get total reactions
      const { count: totalReactions } = await supabase
        .from('live_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId);

      // Get unique viewers
      const { data: participants } = await supabase
        .from('live_reactions')
        .select('user_id, profiles:user_id(username, name, avatar_url)')
        .eq('stream_id', streamId);

      // Get stream data
      const { data: stream } = await supabase
        .from('live_streams')
        .select('viewer_count')
        .eq('id', streamId)
        .single();

      const uniqueParticipants = Array.from(
        new Map(
          participants?.map(p => [p.user_id, p.profiles]) || []
        ).values()
      );

      return {
        likesCount: likesCount || 0,
        totalReactions: totalReactions || 0,
        maxViewers: stream?.viewer_count || 0,
        participants: uniqueParticipants,
      };
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl max-w-2xl w-full p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center"
            >
              <Heart className="w-6 h-6 text-white fill-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white">Live Terminé!</h2>
              <p className="text-white/60 text-sm">Voici vos statistiques</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Likes */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
              <span className="text-white/60 text-sm font-medium">J'aimes</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats?.likesCount.toLocaleString() || 0}
            </p>
          </motion.div>

          {/* Duration */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-500" />
              <span className="text-white/60 text-sm font-medium">Durée</span>
            </div>
            <p className="text-4xl font-bold text-white">{formatDuration(duration)}</p>
          </motion.div>

          {/* Viewers */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-6 h-6 text-purple-500" />
              <span className="text-white/60 text-sm font-medium">Vues Max</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats?.maxViewers.toLocaleString() || 0}
            </p>
          </motion.div>

          {/* Total Reactions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-amber-500" />
              <span className="text-white/60 text-sm font-medium">Réactions</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {stats?.totalReactions.toLocaleString() || 0}
            </p>
          </motion.div>
        </div>

        {/* Participants */}
        {stats?.participants && stats.participants.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({stats.participants.length})
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-48 overflow-y-auto">
              <div className="space-y-3">
                {stats.participants.map((participant: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="w-10 h-10 ring-2 ring-white/20">
                      <AvatarImage src={participant?.avatar_url} />
                      <AvatarFallback>
                        {participant?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {participant?.name || participant?.username}
                      </p>
                      <p className="text-white/40 text-xs">@{participant?.username}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Close Button */}
        <Button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-6 rounded-xl"
        >
          Fermer
        </Button>
      </motion.div>
    </motion.div>
  );
};
