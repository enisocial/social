import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveStreamStats } from './LiveStreamStats';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Camera,
  X,
  Eye,
  MessageCircle,
  Gift,
  Heart,
  ThumbsUp,
  Smile,
  Sparkles,
  Send,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWebRTCStream } from '@/hooks/useWebRTCStream';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useLiveLikes } from '@/hooks/useLiveLikes';
import { Input } from '@/components/ui/input';
import { FloatingReactions } from '@/components/FloatingReactions';
import { triggerReaction } from '@/components/FloatingReactions';
import { supabase } from '@/integrations/supabase/client';
import { GiftPanel } from './GiftPanel';
import { GiftAnimation } from './GiftAnimation';
import { DuoInvitePanel } from '@/components/DuoInvitePanel';
import { DuoInviteNotification } from './DuoInviteNotification';
import { useLiveDuo } from '@/hooks/useLiveDuo';

interface TikTokLiveStreamProps {
  streamId: string;
  isBroadcaster: boolean;
  streamerInfo: {
    username: string;
    name: string;
    avatar_url?: string;
  };
  onEnd?: () => void;
}

export const TikTokLiveStream = ({
  streamId,
  isBroadcaster,
  streamerInfo,
  onEnd,
}: TikTokLiveStreamProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showChat, setShowChat] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [message, setMessage] = useState('');
  const [liveDuration, setLiveDuration] = useState(0);
  const [showStats, setShowStats] = useState(false);

  const {
    initialize,
    isConnected,
    isConnecting,
    audioEnabled,
    videoEnabled,
    viewerCount,
    toggleAudio,
    toggleVideo,
    switchCamera,
  } = useWebRTCStream({
    streamId,
    isBroadcaster,
  });

  const { messages, sendMessage } = useLiveChat(streamId);
  const { duoInvitation, endDuo } = useLiveDuo(streamId);
  const { likesCount, addLike } = useLiveLikes(streamId);

  // Initialize WebRTC once on mount - STABLE with proper dependencies
  useEffect(() => {
    if (!videoRef.current || !isConnected) {
      const initializeStream = async () => {
        if (videoRef.current) {
          console.log('🎬 [LIVE] Initializing stream for streamId:', streamId);
          await initialize(videoRef.current);
        }
      };
      
      initializeStream();
    }
  }, [streamId]); // Only re-initialize if streamId changes

  // Ensure video plays when stream is ready
  useEffect(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      video.play().catch(err => {
        console.warn('⚠️ [LIVE] Autoplay prevented:', err);
      });
    }
  }, [isConnected]);

  // Live duration timer
  useEffect(() => {
    if (!isConnected || showStats) return;

    const interval = setInterval(() => {
      setLiveDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, showStats]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage.mutate(message);
      setMessage('');
    }
  };

  const handleReaction = async (emoji: string) => {
    // Map emoji to database reaction type
    const reactionTypeMap: Record<string, string> = {
      '❤️': 'love',
      '👍': 'like',
      '😊': 'wow',
      '✨': 'clap'
    };

    const reactionType = reactionTypeMap[emoji] || 'like';

    // Trigger local animation immediately for instant feedback
    triggerReaction(emoji);
    
    // Save to database for other viewers
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('live_reactions').insert({
        stream_id: streamId,
        user_id: user.id,
        reaction_type: reactionType,
      });
    }
  };

  const handleLike = () => {
    // Trigger animation
    triggerReaction('❤️');
    // Save to database
    addLike.mutate();
  };

  const handleEndStream = async () => {
    console.log('🛑 [LIVE] Ending stream - button clicked');
    
    // Stop camera and WebRTC connection
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🎥 [LIVE] Stopped track:', track.kind);
      });
      videoRef.current.srcObject = null;
      console.log('🎥 [LIVE] Camera stopped');
    }
    
    // Show stats dashboard immediately WITHOUT updating status yet
    console.log('📊 [LIVE] Setting showStats to true');
    setShowStats(true);
  };

  const handleCloseStats = async () => {
    // Update stream status to ended when closing stats
    console.log('🛑 [LIVE] Updating stream status to ended');
    await supabase
      .from('live_streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);
    console.log('🛑 [LIVE] Stream status updated, calling onEnd');
    
    // Close stats and trigger navigation
    setShowStats(false);
    if (onEnd) onEnd();
  };

  return (
    <>
      {/* Stats Dashboard - Should appear on top of everything */}
      {showStats && (
        <LiveStreamStats
          streamId={streamId}
          duration={liveDuration}
          onClose={handleCloseStats}
        />
      )}

      {/* Live Stream Interface - Hidden when stats are showing */}
      {!showStats && (
        <div className="fixed inset-0 bg-black z-50">
          <FloatingReactions streamId={streamId} />
          <GiftAnimation />
          <DuoInviteNotification streamId={streamId} />

      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isBroadcaster}
        className="absolute inset-0 w-full h-full object-cover"
        onLoadedMetadata={() => console.log('📹 [UI] Video metadata loaded')}
        onPlay={() => console.log('▶️ [UI] Video playing')}
        onError={(e) => console.error('❌ [UI] Video error:', e)}
      />

      {/* Loading Overlay - Better visibility */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="w-16 h-16 border-4 border-primary/30 rounded-full absolute top-0 left-1/2 transform -translate-x-1/2" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold text-lg">
                {isBroadcaster ? '📹 Démarrage de la caméra...' : '🔄 Connexion au live...'}
              </p>
              <p className="text-white/70 text-sm">
                {isBroadcaster ? 'Initialisation du flux vidéo' : 'Réception du signal...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator - More helpful */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
          <div className="text-center space-y-6 px-6">
            <div className="text-6xl mb-4">
              {isBroadcaster ? '📹' : '🔴'}
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold text-xl">
                {isBroadcaster ? 'Caméra en attente' : 'En attente du live'}
              </p>
              <p className="text-white/70 text-sm max-w-md">
                {isBroadcaster 
                  ? 'Vérifiez que votre navigateur a accès à la caméra et au micro'
                  : 'Le streamer n\'a pas encore démarré la diffusion'
                }
              </p>
            </div>
            <Button 
              onClick={() => {
                if (videoRef.current) {
                  console.log('🔄 [UI] Manual retry requested');
                  initialize(videoRef.current);
                }
              }}
              className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
            >
              {isBroadcaster ? '🎬 Démarrer la caméra' : '🔄 Réessayer'}
            </Button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20">
        <div className="flex items-center justify-between">
          {/* Streamer Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-red-500">
              <AvatarImage src={streamerInfo.avatar_url} />
              <AvatarFallback>{streamerInfo.username[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-bold text-sm">{streamerInfo.username}</p>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="px-2 py-0.5 bg-red-500 rounded-full flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  <span className="text-white text-xs font-bold">LIVE</span>
                </motion.div>
                {isConnected && (
                  <span className="text-white/90 text-xs">{formatDuration(liveDuration)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Likes Counter, Viewer Count, Duo Status & Close */}
          <div className="flex items-center gap-2">
            {/* Likes Counter (TikTok Style) - Animated on change */}
            <motion.div
              key={`likes-${likesCount}`}
              initial={{ scale: 1.2, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="px-3 py-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center gap-2 shadow-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
              >
                <Heart className="w-4 h-4 text-white fill-white" />
              </motion.div>
              <motion.span 
                key={likesCount}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-white font-bold text-sm"
              >
                {likesCount.toLocaleString()}
              </motion.span>
            </motion.div>

            {/* Duo Indicator */}
            {duoInvitation?.status === 'accepted' && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </motion.div>
                <span className="text-white font-bold text-xs">LIVE DUO</span>
              </div>
            )}

            <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-2">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">{viewerCount}</span>
            </div>

            {/* Duo Invite Button (broadcaster only) */}
            {isBroadcaster && !duoInvitation && (
              <DuoInvitePanel streamId={streamId} />
            )}

            {/* End Duo Button (when duo is active) */}
            {isBroadcaster && duoInvitation?.status === 'accepted' && (
              <Button
                size="sm"
                onClick={() => duoInvitation && endDuo.mutate(duoInvitation.id)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-1 text-xs"
              >
                Terminer Duo
              </Button>
            )}

            {/* Close Button - Broadcaster only OR viewer exit button */}
            {isBroadcaster ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={onEnd}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onEnd}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 backdrop-blur-sm font-medium transition-all"
              >
                Quitter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-3 z-20">
        {/* Main Like Button (TikTok Style - Bigger) with Counter */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.85 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            onClick={handleLike}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 transition-all"
          >
            <Heart className="w-7 h-7 fill-white" />
          </motion.button>
          
          {/* Live Counter Badge */}
          <motion.div
            key={likesCount}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-2 -right-2 min-w-[2rem] px-2 py-1 bg-white rounded-full shadow-lg"
          >
            <p className="text-xs font-bold text-pink-500 text-center">
              {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
            </p>
          </motion.div>
        </div>

        {/* Other Reactions */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('👍')}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          <ThumbsUp className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('😊')}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          <Smile className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('✨')}
          className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          <Sparkles className="w-6 h-6" />
        </motion.button>

        {/* Chat Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowChat(!showChat)}
          className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center text-white transition-colors ${
            showChat ? 'bg-primary' : 'bg-black/60 hover:bg-black/80'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>

        {/* Gift Button (viewers only) */}
        {!isBroadcaster && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowGifts(!showGifts)}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white shadow-lg"
          >
            <Gift className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute left-4 bottom-24 w-72 max-h-96 z-20"
          >
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 space-y-3">
              {/* Messages */}
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                {messages && messages.length > 0 ? (
                  messages.slice(-10).map((msg: any) => (
                    <motion.div
                      key={msg.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="text-white"
                    >
                      <span className="font-bold text-primary">{msg.profiles?.username || 'User'}: </span>
                      <span className="text-sm">{msg.message}</span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-white/60 text-sm text-center py-4">
                    Aucun message pour le moment
                  </p>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Envoyer un message..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Panel */}
      <AnimatePresence>
        {showGifts && !isBroadcaster && (
          <GiftPanel streamId={streamId} onClose={() => setShowGifts(false)} />
        )}
      </AnimatePresence>

      {/* Broadcaster Controls */}
      {isBroadcaster && isConnected && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 left-4 right-4 z-20"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant={audioEnabled ? 'default' : 'destructive'}
                onClick={toggleAudio}
                className="rounded-full"
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                size="icon"
                variant={videoEnabled ? 'default' : 'destructive'}
                onClick={toggleVideo}
                className="rounded-full"
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                size="icon"
                variant="secondary"
                onClick={switchCamera}
                className="rounded-full"
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>

            <Button variant="destructive" onClick={handleEndStream} className="rounded-full px-6">
              <X className="w-5 h-5 mr-2" />
              Terminer
            </Button>
          </div>
        </motion.div>
      )}
        </div>
      )}
    </>
  );
};
