import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, X, Sparkles, Users, Eye, Camera } from "lucide-react";
import { useLiveStreams } from "@/hooks/useLiveStreams";
import { LiveStreamCard } from "@/components/LiveStreamCard";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const LiveStreams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { streams, createStream } = useLiveStreams();

  // Start camera preview
  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setShowPreview(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Impossible d\'accéder à la caméra');
    }
  };

  // Stop camera preview
  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowPreview(false);
    setTitle("");
  };

  // Create and start live
  const handleStartLive = async () => {
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre pour votre live');
      return;
    }

    try {
      const newStream = await createStream.mutateAsync({
        title: title.trim(),
      });

      // Stop preview stream
      stopPreview();
      
      // Navigate to live stream page
      navigate(`/live/${newStream.id}`);
    } catch (error) {
      console.error('Error creating stream:', error);
      toast.error('Erreur lors de la création du live');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const activeStreams = streams?.filter(s => s.status === 'live') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Lives
              </h1>
              <p className="text-sm text-muted-foreground">
                Créez votre live ou regardez vos amis
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create Live Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Camera Preview or Start Button */}
            {!showPreview ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startPreview}
                className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden group bg-gradient-to-br from-primary/20 via-primary/10 to-background border-2 border-primary/20 shadow-2xl"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--primary)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-5" />
                
                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center p-8">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-2xl group-hover:shadow-primary/50 transition-shadow"
                  >
                    <Camera className="w-16 h-16 text-primary-foreground" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-2">Créer un Live</h3>
                  <p className="text-muted-foreground text-center max-w-xs mb-6">
                    Partagez vos moments en direct avec vos amis
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">Commencer maintenant</span>
                  </div>
                </div>

                {/* Animated Border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary via-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl"
              >
                {/* Video Preview */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50">
                  {/* Top Bar */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-white">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user?.user_metadata?.name?.[0] || user?.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-bold text-sm">
                          {user?.user_metadata?.name || user?.email}
                        </p>
                        <p className="text-white/80 text-xs">Prévisualisation</p>
                      </div>
                    </div>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={stopPreview}
                      className="text-white hover:bg-white/20 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Donnez un titre à votre live..."
                      className="bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/60 text-lg h-14"
                      maxLength={100}
                    />
                    
                    <Button
                      onClick={handleStartLive}
                      disabled={!title.trim() || createStream.isPending}
                      className="w-full h-14 text-lg font-bold rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-2xl disabled:opacity-50"
                    >
                      <Video className="w-6 h-6 mr-2" />
                      {createStream.isPending ? 'Démarrage...' : 'Démarrer le Live'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Stats */}
            {!showPreview && (
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-2xl font-bold">{activeStreams.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Lives actifs</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-2xl font-bold">
                      {activeStreams.reduce((sum, s) => sum + (s.viewer_count || 0), 0)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Spectateurs</p>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Active Streams Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                Lives en cours
              </h2>
              <span className="text-sm text-muted-foreground">
                {activeStreams.length} {activeStreams.length === 1 ? 'live' : 'lives'}
              </span>
            </div>

            {activeStreams.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {activeStreams.map((stream, index) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <LiveStreamCard stream={stream} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Video className="w-10 h-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucun live actif</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Soyez le premier à lancer un live et partagez vos moments avec vos amis !
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LiveStreams;
