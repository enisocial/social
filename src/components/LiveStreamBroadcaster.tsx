import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Camera, 
  X,
  Users,
  Eye,
  Play
} from 'lucide-react';
import { LiveStreamManager } from '@/utils/webrtc.utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStreamBroadcasterProps {
  streamId: string;
  onEnd: () => void;
}

export function LiveStreamBroadcaster({ streamId, onEnd }: LiveStreamBroadcasterProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamManagerRef = useRef<LiveStreamManager | null>(null);
  
  const [isLive, setIsLive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    // Subscribe to viewer count updates
    const channel = supabase
      .channel(`live-stream-${streamId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const viewers = Object.keys(state).filter(key => key !== user?.id).length;
        setViewerCount(viewers);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, user?.id]);

  // Initialize camera preview - Auto-start on mobile
  useEffect(() => {
    const initPreview = async () => {
      if (!videoRef.current || !user || isLive) return;

      try {
        streamManagerRef.current = new LiveStreamManager();
        await streamManagerRef.current.startLocalStream(videoRef.current);
        
        // Auto-start countdown on mobile for better UX
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && showPreview) {
          setTimeout(() => startCountdown(), 1000);
        }
      } catch (error) {
        console.error('Failed to access camera:', error);
        toast.error('Impossible d\'accéder à la caméra');
      }
    };

    initPreview();
  }, [user, isLive]);

  // Live duration timer
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLiveDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const startCountdown = () => {
    setCountdown(3);
    setShowPreview(false);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      startBroadcast();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const startBroadcast = async () => {
    if (!videoRef.current || !user) return;

    setIsLoading(true);
    try {
      // Update stream status to live
      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
          viewer_count: 0
        })
        .eq('id', streamId);

      if (error) throw error;

      // Notify friends about the live stream
      const { data: friends } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (friends) {
        const friendIds = friends.map(f => 
          f.sender_id === user.id ? f.receiver_id : f.sender_id
        );

        // Create notifications for friends
        const notifications = friendIds.map(friendId => ({
          user_id: friendId,
          type: 'live_stream' as const,
          metadata: {
            stream_id: streamId,
            streamer_id: user.id,
            streamer_name: user.user_metadata?.name || user.email
          }
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setIsLive(true);
      setLiveDuration(0);
      toast.success('🎥 Vous êtes en direct!');
    } catch (error) {
      console.error('Error starting broadcast:', error);
      toast.error('Erreur lors du démarrage du live');
    } finally {
      setIsLoading(false);
    }
  };

  const endBroadcast = async () => {
    try {
      // Stop local stream first
      if (streamManagerRef.current) {
        streamManagerRef.current.stopLocalStream();
        streamManagerRef.current = null;
      }

      // Update stream status
      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', streamId);

      if (error) throw error;

      // Clean up state
      setIsLive(false);
      setShowPreview(false);
      setLiveDuration(0);
      
      toast.success('🎬 Live terminé avec succès!');
      
      // Retour immédiat à la page des lives avec remplacement de l'historique
      setTimeout(() => {
        onEnd();
      }, 500);
    } catch (error) {
      console.error('Error ending broadcast:', error);
      toast.error('Erreur lors de la fin du live');
    }
  };

  const toggleAudio = () => {
    if (streamManagerRef.current) {
      const newState = !audioEnabled;
      streamManagerRef.current.toggleAudio(newState);
      setAudioEnabled(newState);
    }
  };

  const toggleVideo = () => {
    if (streamManagerRef.current) {
      const newState = !videoEnabled;
      streamManagerRef.current.toggleVideo(newState);
      setVideoEnabled(newState);
    }
  };

  const switchCamera = () => {
    if (streamManagerRef.current) {
      streamManagerRef.current.switchCamera();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-white text-9xl font-bold"
            >
              {countdown === 0 ? '🎬' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls Bar - Mobile responsive */}
      <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex items-center justify-between z-10">
        {/* Live Indicator with Duration */}
        {isLive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 md:gap-3 bg-gradient-to-r from-red-600 to-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold shadow-lg text-sm md:text-base"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"
            />
            <span>LIVE</span>
            <span className="text-xs md:text-sm opacity-90">{formatDuration(liveDuration)}</span>
          </motion.div>
        )}

        {/* Viewer Count */}
        {isLive && (
          <div className="flex items-center gap-1 md:gap-2 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg">
            <Eye className="w-3 h-3 md:w-4 md:h-4" />
            <span className="font-bold text-sm md:text-base">{viewerCount}</span>
          </div>
        )}
      </div>

      {/* Center Start Button (Preview Mode) */}
      {showPreview && !isLive && countdown === null && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={startCountdown}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-12 py-8 text-xl font-bold shadow-2xl"
            >
              <Play className="w-8 h-8 mr-3" />
              Démarrer le Live
            </Button>
            <p className="text-white text-sm mt-4 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
              Préparez-vous à diffuser en direct
            </p>
          </motion.div>
        </div>
      )}

      {/* Bottom Controls (Live Mode) - Mobile optimized */}
      {isLive && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 z-10"
        >
          <Card className="bg-black/80 backdrop-blur-md border-white/20 p-2 md:p-4">
            <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap md:flex-nowrap">
              {/* Stream Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant={audioEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleAudio}
                  className="rounded-full w-10 h-10 md:w-12 md:h-12"
                >
                  {audioEnabled ? <Mic className="w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>

                <Button
                  variant={videoEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleVideo}
                  className="rounded-full w-10 h-10 md:w-12 md:h-12"
                >
                  {videoEnabled ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <VideoOff className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full w-10 h-10 md:w-12 md:h-12"
                >
                  <Camera className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>

              {/* End Stream Button */}
              <Button
                variant="destructive"
                onClick={endBroadcast}
                disabled={isLoading}
                className="rounded-full px-4 py-2 md:px-6 md:py-6 font-bold shadow-lg text-xs md:text-base w-full md:w-auto"
              >
                <X className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden md:inline">Terminer le Live</span>
                <span className="md:hidden">Terminer</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
