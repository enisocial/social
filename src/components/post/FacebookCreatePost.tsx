import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Image, Video, Smile, X, Globe, Users, Lock, MapPin, Zap, PenTool,
  Sparkles, Heart, MessageCircle, Share2, Camera, Mic, Palette,
  Hash, AtSign, TrendingUp, Crown, Star, Flame, Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaUploader } from './MediaUploader';

type PostPrivacy = 'public' | 'friends' | 'private';

export const FacebookCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // États pour humeur et lieu
  const [feelingDialogOpen, setFeelingDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Veuillez ajouter du contenu ou un média');
      return;
    }

    if (!user) return;
    setIsSubmitting(true);
    setUploadProgress(5); // Démarrage

    try {
      // Étape 1: Création du post (10%)
      toast.loading('Création du post...', { id: 'post-creation' });

      // Construire le contenu final avec humeur et lieu
      let finalContent = content.trim();
      if (selectedFeeling) {
        finalContent = `${selectedFeeling}\n\n${finalContent}`;
      }
      if (selectedLocation) {
        finalContent = `${finalContent}\n\n${selectedLocation}`;
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: finalContent,
          privacy: privacy
        })
        .select()
        .single();

      if (postError) throw postError;
      setUploadProgress(15);

      // Étape 2: Upload des médias si nécessaire
      if (mediaFiles.length > 0) {
        const totalFiles = mediaFiles.length;
        toast.loading(`Upload des fichiers (0/${totalFiles})...`, { id: 'post-creation' });

        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

          // Progression de 15% à 85% pour les uploads
          const progressStart = 15;
          const progressEnd = 85;
          const fileProgress = progressStart + ((i / totalFiles) * (progressEnd - progressStart));
          setUploadProgress(Math.round(fileProgress));

          toast.loading(`Upload des fichiers (${i + 1}/${totalFiles})...`, { id: 'post-creation' });

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(fileName);

          const mediaType = file.type.startsWith('video') ? 'video' : 'image';

          // Insérer dans post_media pour tous les médias
          await supabase.from('post_media').insert({
            post_id: post.id,
            media_url: publicUrl,
            media_type: mediaType,
            order_index: i,
            media_order: i
          });

          // Mise à jour du post avec le premier média (pour compatibilité)
          if (i === 0) {
            await supabase
              .from('posts')
              .update({
                media_url: publicUrl,
                media_type: mediaType
              })
              .eq('id', post.id);
          }

          // Progression finale de chaque fichier
          const fileFinalProgress = progressStart + (((i + 1) / totalFiles) * (progressEnd - progressStart));
          setUploadProgress(Math.round(fileFinalProgress));
        }
      }

      // Étape 3: Finalisation (90-100%)
      setUploadProgress(90);
      toast.loading('Finalisation...', { id: 'post-creation' });

      // Petit délai pour l'animation
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(100);

      toast.success('Post publié avec succès !', { id: 'post-creation' });

      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setPrivacy('public');
      setSelectedFeeling(null);
      setSelectedLocation(null);

      // Petit délai avant de fermer
      await new Promise(resolve => setTimeout(resolve, 500));
      setDialogOpen(false);

      // Refresh feed immédiatement
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['smart-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['optimized-feed'] }), // Fixed key
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-posts'] })
      ]);

      // Force un refetch
      await queryClient.refetchQueries({ queryKey: ['optimized-feed'] });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la publication', { id: 'post-creation' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const privacyIcons = {
    public: <Globe className="h-4 w-4" />,
    friends: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  };

  const actionButtons = [
    {
      id: 'media',
      label: 'Photo/vidéo',
      icon: Camera,
      color: 'from-green-500 to-emerald-500',
      hoverColor: 'hover:from-green-600 hover:to-emerald-600',
      action: () => {
        setDialogOpen(true);
        setTimeout(() => {
          const input = document.getElementById('media-input');
          if (input) input.click();
        }, 100);
      }
    },
    {
      id: 'live',
      label: 'Vidéo en direct',
      icon: Video,
      color: 'from-red-500 to-pink-500',
      hoverColor: 'hover:from-red-600 hover:to-pink-600',
      action: () => navigate('/live')
    },
    {
      id: 'feeling',
      label: 'Humeur',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      hoverColor: 'hover:from-pink-600 hover:to-rose-600',
      action: () => setFeelingDialogOpen(true)
    },
    {
      id: 'location',
      label: 'Lieu',
      icon: MapPin,
      color: 'from-blue-500 to-indigo-500',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-600',
      action: () => setLocationDialogOpen(true)
    }
  ];

  return (
    <>
      {/* Ultra-Modern Create Post Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-6 overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-50/90 dark:from-slate-800/95 dark:via-blue-950/20 dark:to-indigo-950/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/30 dark:border-blue-800/30"
      >
        {/* Dynamic Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear"
            }}
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)",
              backgroundSize: "50% 50%, 50% 50%"
            }}
          />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 0.6, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-sm"
              style={{
                left: `${15 + i * 15}%`,
                top: '20%'
              }}
            />
          ))}
        </div>

        <div className="relative p-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                <PenTool className="w-7 h-7 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </motion.div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                Créer une publication
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Partagez vos pensées avec votre communauté
              </p>
            </div>

            {/* Activity Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span className="font-bold">Créatif</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-lg">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                  {profile?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDialogOpen(true)}
                  className="w-full text-left p-4 bg-gradient-to-r from-white/80 to-slate-50/80 dark:from-slate-700/80 dark:to-slate-600/80 backdrop-blur-sm rounded-2xl border-2 border-slate-200/50 dark:border-slate-600/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <PenTool className="w-5 h-5 text-blue-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Quoi de neuf, {profile?.name?.split(' ')[0]} ?
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Partagez une photo, une pensée ou lancez une discussion...
                  </p>
                </motion.button>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {actionButtons.map((button, index) => (
                <motion.div
                  key={button.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setHoveredAction(button.id)}
                  onHoverEnd={() => setHoveredAction(null)}
                  className="relative group"
                >
                  <Button
                    onClick={button.action}
                    className={`relative overflow-hidden w-full h-16 bg-gradient-to-r ${button.color} ${button.hoverColor} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl`}
                  >
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Floating Particles */}
                    <AnimatePresence>
                      {hoveredAction === button.id && (
                        <div className="absolute inset-0">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0, y: 0 }}
                              animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0],
                                y: [-10, -20, -10]
                              }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{
                                duration: 2,
                                delay: i * 0.2,
                                repeat: Infinity,
                                ease: "easeOut"
                              }}
                              className="absolute w-1 h-1 bg-white/80 rounded-full"
                              style={{
                                left: `${20 + i * 20}%`,
                                top: '60%'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <button.icon className="w-6 h-6" />
                      <span className="text-xs font-bold">{button.label}</span>
                    </div>
                  </Button>

                  {/* Hover Tooltip */}
                  <AnimatePresence>
                    {hoveredAction === button.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl whitespace-nowrap z-20"
                      >
                        <div className="flex items-center gap-2">
                          <button.icon className="w-3 h-3" />
                          <span>{button.label}</span>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Footer Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-6 pt-4 border-t border-blue-200/30 dark:border-blue-800/30"
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>Posts actifs: 1,247</span>
            </div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Communauté: 15.3K</span>
            </div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Tendance</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Ultra-Modern Create Post Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-50/90 dark:from-slate-800/95 dark:via-blue-950/20 dark:to-indigo-950/20 backdrop-blur-xl border border-blue-200/30 dark:border-blue-800/30 rounded-3xl shadow-2xl">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <motion.div
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear"
              }}
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.2) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(147, 51, 234, 0.2) 0%, transparent 50%)",
                backgroundSize: "60% 60%, 60% 60%"
              }}
            />
          </div>

          <div className="relative">
            <DialogHeader className="pb-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                    Créer une publication
                  </DialogTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Exprimez-vous et connectez-vous avec votre communauté
                  </p>
                </div>
              </motion.div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info & Privacy Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-white/60 to-slate-50/60 dark:from-slate-700/60 dark:to-slate-600/60 rounded-2xl border border-slate-200/50 dark:border-slate-600/50"
              >
                <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                    {profile?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{profile?.name}</p>
                  <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                    <SelectTrigger className="w-[160px] h-9 text-sm bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        {privacyIcons[privacy]}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200 dark:border-slate-600">
                      <SelectItem value="public" className="hover:bg-blue-50 dark:hover:bg-blue-950/30">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <span>Public</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="friends" className="hover:bg-green-50 dark:hover:bg-green-950/30">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-500" />
                          <span>Amis</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private" className="hover:bg-gray-50 dark:hover:bg-gray-950/30">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-gray-500" />
                          <span>Privé</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              {/* Feeling/Location Preview */}
              <AnimatePresence>
                {(selectedFeeling || selectedLocation) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedFeeling && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{selectedFeeling.split(' ')[0]}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {selectedFeeling.split(' ').slice(1).join(' ')}
                            </span>
                          </div>
                        )}
                        {selectedFeeling && selectedLocation && (
                          <div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        )}
                        {selectedLocation && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{selectedLocation}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedFeeling && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedFeeling(null)}
                            className="h-8 px-3 text-xs border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                          >
                            Retirer humeur
                          </Button>
                        )}
                        {selectedLocation && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLocation(null)}
                            className="h-8 px-3 text-xs border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            Retirer lieu
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content Textarea */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative"
              >
                <Textarea
                  placeholder={`Quoi de neuf, ${profile?.name?.split(' ')[0]} ? Partagez vos pensées, vos expériences...`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[140px] border-2 border-slate-200/50 dark:border-slate-600/50 focus:border-blue-400 dark:focus:border-blue-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl text-lg resize-none shadow-lg focus:shadow-xl transition-all duration-300"
                  disabled={isSubmitting}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    className="p-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Smile className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Hash className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Media Uploader */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <MediaUploader
                  files={mediaFiles}
                  setFiles={setMediaFiles}
                  previews={mediaPreviews}
                  setPreviews={setMediaPreviews}
                  inputRef={fileInputRef}
                />
              </motion.div>

              {/* Upload Progress - Ultra Modern */}
              <AnimatePresence>
                {uploadProgress > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50 shadow-xl"
                  >
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 animate-pulse"></div>

                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: uploadProgress < 100 ? 360 : 0 }}
                            transition={{ duration: 2, repeat: uploadProgress < 100 ? Infinity : 0, ease: "linear" }}
                            className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg"
                          >
                            {uploadProgress === 100 ? (
                              <Crown className="w-4 h-4 text-white" />
                            ) : (
                              <Zap className="w-4 h-4 text-white" />
                            )}
                          </motion.div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {uploadProgress < 15 ? 'Initialisation...' :
                               uploadProgress < 85 ? 'Téléchargement...' :
                               uploadProgress < 100 ? 'Finalisation...' :
                               'Publication réussie ! ✨'}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {uploadProgress < 15 ? 'Préparation de votre post' :
                               uploadProgress < 85 ? `Upload des médias (${mediaFiles.length > 0 ? mediaFiles.length : '0'} fichier${mediaFiles.length > 1 ? 's' : ''})` :
                               uploadProgress < 100 ? 'Mise en ligne...' :
                               'Votre post est maintenant visible !'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {uploadProgress}%
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <Progress value={uploadProgress} className="h-3 bg-slate-200 dark:bg-slate-700" />
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: `${uploadProgress - 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                        />
                      </div>

                      {/* Success Animation */}
                      {uploadProgress === 100 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="flex justify-center"
                        >
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0, y: 0 }}
                                animate={{ scale: 1, y: -10 }}
                                transition={{
                                  delay: i * 0.1,
                                  type: "spring",
                                  stiffness: 300
                                }}
                                className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Action Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl border border-slate-200/50 dark:border-slate-600/50"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Ajouter à votre publication
                  </span>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => document.getElementById('media-input')?.click()}
                      disabled={isSubmitting}
                      className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                      title="Photo/Vidéo"
                    >
                      <Camera className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      disabled={isSubmitting}
                      className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                      title="Étiquettes"
                    >
                      <Hash className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      disabled={isSubmitting}
                      className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                      title="Emojis"
                    >
                      <Smile className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {content.length}/2000 caractères
                  </div>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Publication...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Publier</span>
                      </div>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feeling Selection Dialog */}
      <Dialog open={feelingDialogOpen} onOpenChange={setFeelingDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white/95 via-pink-50/90 to-rose-50/90 dark:from-slate-800/95 dark:via-pink-950/20 dark:to-rose-950/20 backdrop-blur-xl border border-pink-200/30 dark:border-pink-800/30 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-700 via-rose-700 to-red-700 dark:from-pink-300 dark:via-rose-300 dark:to-red-300 bg-clip-text text-transparent">
                  Comment vous sentez-vous ?
                </DialogTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Partagez votre humeur avec vos amis
                </p>
              </div>
            </motion.div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { emoji: '😊', label: 'Heureux', color: 'from-yellow-400 to-orange-400' },
                { emoji: '😍', label: 'Amoureux', color: 'from-pink-400 to-rose-400' },
                { emoji: '😢', label: 'Triste', color: 'from-blue-400 to-indigo-400' },
                { emoji: '😡', label: 'En colère', color: 'from-red-400 to-red-500' },
                { emoji: '😴', label: 'Fatigué', color: 'from-gray-400 to-gray-500' },
                { emoji: '🤔', label: 'Pensif', color: 'from-purple-400 to-purple-500' },
                { emoji: '🎉', label: 'Fêtard', color: 'from-green-400 to-emerald-400' },
                { emoji: '😎', label: 'Cool', color: 'from-cyan-400 to-blue-400' },
                { emoji: '🤗', label: 'Câlin', color: 'from-pink-300 to-rose-300' },
                { emoji: '😱', label: 'Surpris', color: 'from-orange-400 to-red-400' },
                { emoji: '🤤', label: 'Affamé', color: 'from-amber-400 to-yellow-400' },
                { emoji: '😇', label: 'Saint', color: 'from-indigo-400 to-purple-400' }
              ].map((feeling, index) => (
                <motion.button
                  key={feeling.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedFeeling(`${feeling.emoji} se sent ${feeling.label.toLowerCase()}`);
                    setFeelingDialogOpen(false);
                    toast.success(`Humeur sélectionnée : ${feeling.emoji} ${feeling.label}`);
                  }}
                  className={`p-4 bg-gradient-to-r ${feeling.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-white`}
                >
                  <div className="text-center space-y-2">
                    <div className="text-3xl">{feeling.emoji}</div>
                    <div className="text-sm font-bold">{feeling.label}</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-pink-200/30 dark:border-pink-800/30">
              <Button
                variant="outline"
                onClick={() => setFeelingDialogOpen(false)}
                className="border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/30"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Selection Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-50/90 dark:from-slate-800/95 dark:via-blue-950/20 dark:to-indigo-950/20 backdrop-blur-xl border border-blue-200/30 dark:border-blue-800/30 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 dark:from-blue-300 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
                  Où êtes-vous ?
                </DialogTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Partagez votre position avec vos amis
                </p>
              </div>
            </motion.div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Location Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                setLocationLoading(true);
                try {
                  if (!navigator.geolocation) {
                    toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
                    return;
                  }

                  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 300000
                    });
                  });

                  const { latitude, longitude } = position.coords;

                  // Reverse geocoding approximatif (vous pouvez utiliser une API comme Google Maps)
                  const locationName = `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                  setSelectedLocation(locationName);
                  setLocationDialogOpen(false);
                  toast.success('Position actuelle détectée !');
                } catch (error) {
                  console.error('Error getting location:', error);
                  toast.error('Impossible de détecter votre position. Vérifiez vos permissions.');
                } finally {
                  setLocationLoading(false);
                }
              }}
              disabled={locationLoading}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  {locationLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <MapPin className="w-6 h-6" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-bold">
                    {locationLoading ? 'Détection en cours...' : 'Utiliser ma position actuelle'}
                  </div>
                  <div className="text-sm opacity-90">
                    {locationLoading ? 'Veuillez patienter...' : 'Détecter automatiquement votre position'}
                  </div>
                </div>
              </div>
            </motion.button>

            {/* Popular Locations */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Lieux populaires</h4>
              <div className="grid grid-cols-1 gap-3">
                {[
                  '🏠 À la maison',
                  '🏢 Au bureau',
                  '🏫 À l\'école',
                  '🏖️ À la plage',
                  '🏔️ En montagne',
                  '✈️ En voyage',
                  '🏪 Au supermarché',
                  '☕ Au café'
                ].map((location, index) => (
                  <motion.button
                    key={location}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedLocation(location);
                      setLocationDialogOpen(false);
                      toast.success(`Lieu sélectionné : ${location}`);
                    }}
                    className="p-3 bg-gradient-to-r from-white/80 to-slate-50/80 dark:from-slate-700/80 dark:to-slate-600/80 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 text-left"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{location}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-blue-200/30 dark:border-blue-800/30">
              <Button
                variant="outline"
                onClick={() => setLocationDialogOpen(false)}
                className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
