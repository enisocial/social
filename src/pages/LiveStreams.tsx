import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, X, Sparkles, Users, Eye, Camera, Zap, Radio, Activity, Globe, Play, Settings } from "lucide-react";
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

  // Statistiques des lives
  const stats = {
    total: streams?.length || 0,
    active: activeStreams.length,
    viewers: activeStreams.reduce((sum, s) => sum + (s.viewer_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* HEADER ULTRA-MODERNE AFRICAIN */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        {/* Fond avec motifs africains subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-teal-500/5 to-cyan-500/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            {/* ICÔNE PRINCIPALE */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Radio className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* TITRE PRINCIPAL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Streaming Live
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🌍 Connectez-vous en direct avec votre communauté panafricaine
              </p>
            </motion.div>

            {/* STATISTIQUES RAPIDES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 mt-8"
            >
              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-200/50">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {stats.active} live{stats.active !== 1 ? 's' : ''} actif{stats.active !== 1 ? 's' : ''}
                </span>
              </div>

              {stats.viewers > 0 && (
                <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-teal-200/50">
                  <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {stats.viewers} spectateur{stats.viewers !== 1 ? 's' : ''} en ligne
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-cyan-200/50">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Streaming communautaire
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* SECTION CRÉATION DE LIVE ULTRA-MODERNE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
          >
            {/* PRÉVISUALISATION OU BOUTON DÉMARRER */}
            {!showPreview ? (
              // BOUTON CRÉER LIVE ULTRA-MODERNE
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startPreview}
                className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden group bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-2xl"
              >
                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-3xl blur-sm"></div>

                {/* MOTIFS AFRICAINS SUBTILS */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--emerald-400)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-5"></div>

                {/* CONTENU */}
                <div className="relative h-full flex flex-col items-center justify-center p-8">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center mb-6 shadow-2xl group-hover:shadow-emerald-500/50 transition-shadow"
                  >
                    <Camera className="w-16 h-16 text-white" />
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">Lancer un Live</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-xs mb-6 leading-relaxed">
                    Partagez vos moments authentiques avec votre communauté panafricaine en temps réel
                  </p>

                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <Zap className="w-5 h-5" />
                    <span>Aller en direct maintenant</span>
                  </div>
                </div>

                {/* ANIMATION DE BORDE */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 group-hover:opacity-20 transition-opacity blur-xl"></div>
              </motion.button>
            ) : (
              // PRÉVISUALISATION ULTRA-MODERNE
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-2 border-white dark:border-gray-800"
              >
                {/* VIDÉO DE PRÉVISUALISATION */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* OVERLAY DE CONTRÔLES */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60">
                  {/* BARRE SUPÉRIEURE */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 ring-3 ring-white shadow-lg">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-emerald-500 text-white font-bold">
                          {user?.user_metadata?.name?.[0] || user?.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-bold text-sm">
                          {user?.user_metadata?.name || user?.email}
                        </p>
                        <p className="text-white/80 text-xs flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Prévisualisation en direct
                        </p>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={stopPreview}
                      className="text-white hover:bg-white/20 rounded-full border border-white/30"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* CONTRÔLES INFÉRIEURS */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="🎯 Quel est le thème de votre live ?"
                      className="bg-white/10 backdrop-blur-md border-white/30 text-white placeholder:text-white/70 text-lg h-14 rounded-2xl"
                      maxLength={100}
                    />

                    <Button
                      onClick={handleStartLive}
                      disabled={!title.trim() || createStream.isPending}
                      className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-2xl disabled:opacity-50 transition-all"
                    >
                      <Video className="w-6 h-6 mr-2" />
                      {createStream.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Lancement en cours...
                        </div>
                      ) : (
                        '🚀 Aller en direct !'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATISTIQUES RAPIDES ULTRA-MODERNES */}
            {!showPreview && (
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50 shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-3xl font-black text-gray-800 dark:text-gray-200">{stats.active}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Lives actifs</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Diffusion en cours</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-white/95 via-teal-50/80 to-white/95 dark:from-gray-800/95 dark:via-teal-950/20 dark:to-gray-800/95 backdrop-blur-sm border border-teal-200/50 dark:border-teal-800/50 shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-3xl font-black text-gray-800 dark:text-gray-200">{stats.viewers}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Spectateurs</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Audience totale</p>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* SECTION LIVES ACTIFS ULTRA-MODERNE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800 dark:text-gray-200">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center"
                >
                  <Radio className="w-2 h-2 text-white" />
                </motion.div>
                Lives en cours
              </h2>
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                <Globe className="w-4 h-4" />
                {stats.active} actif{stats.active !== 1 ? 's' : ''}
              </div>
            </div>

            {activeStreams.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {activeStreams.map((stream, index) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <LiveStreamCard stream={stream} />
                  </motion.div>
                ))}
              </div>
            ) : (
              // ÉTAT VIDE ULTRA-MODERNE AFRICAIN
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-[400px] flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-emerald-200/50 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/10 dark:to-teal-950/10"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                    <Radio className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {/* Motifs décoratifs africains */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>

                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  Aucun live actif
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-6 max-w-sm">
                  Soyez le premier à lancer un live et créez des connexions authentiques avec votre communauté panafricaine !
                </p>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Démarrer le premier live
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreams;
