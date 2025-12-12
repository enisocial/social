import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Volume2, VolumeX } from 'lucide-react';
import { LiveStreamViewer } from '@/utils/webrtc.utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

interface LiveStreamPlayerProps {
  streamId: string;
  viewerCount: number;
}

export function LiveStreamPlayer({ streamId, viewerCount }: LiveStreamPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<LiveStreamViewer | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    if (!videoRef.current || !user) return;

    const connectToStream = async () => {
      try {
        viewerRef.current = new LiveStreamViewer();
        
        // Join presence channel
        const channel = supabase.channel(`live-stream-${streamId}`);
        
        await channel
          .on('presence', { event: 'sync' }, () => {
            console.log('Presence synced');
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString()
              });
            }
          });

        // In a real implementation, you would:
        // 1. Request WebRTC signaling data from the broadcaster
        // 2. Establish peer connection
        // 3. Receive video stream
        
        setIsConnecting(false);
      } catch (error) {
        console.error('Error connecting to stream:', error);
        setIsConnecting(false);
      }
    };

    connectToStream();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.disconnect();
      }
    };
  }, [streamId, user]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video player */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-4 left-4 z-10"
      >
        <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full font-semibold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      </motion.div>

      {/* Viewer count */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
          <Eye className="w-4 h-4" />
          <span className="font-semibold">{viewerCount}</span>
        </div>
      </div>

      {/* Connecting overlay */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Connexion au live...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="icon"
          className="rounded-full bg-black/60 backdrop-blur-sm border-white/20 hover:bg-black/80"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}
