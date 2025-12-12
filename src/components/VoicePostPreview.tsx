import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Heart, MessageCircle, Share, MoreHorizontal, Send, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShareDialog } from '@/components/ShareDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useVoicePosts } from '@/hooks/useVoicePosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoicePostPreviewProps {
  id: string;
  title?: string;
  audio_url: string;
  audio_duration: number;
  waveform_data?: any;
  user_id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  listens_count: number;
  views_count?: number;
  user_liked: boolean;
  user_listened: boolean;
  created_at: string;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (id: string) => void;
  onListen: (id: string, duration: number, completed: boolean) => void;
}

export const VoicePostPreview: React.FC<VoicePostPreviewProps> = ({
  id,
  title,
  audio_url,
  audio_duration,
  waveform_data,
  user_id,
  username,
  name,
  avatar_url,
  likes_count,
  comments_count,
  listens_count,
  user_liked,
  user_listened,
  created_at,
  onLike,
  onComment,
  onShare,
  onListen
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio_duration);
  const [isVisible, setIsVisible] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listenStartTime, setListenStartTime] = useState<number | null>(null);

  // État pour les commentaires
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // État pour le partage
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // État pour les vues
  const [viewsCount, setViewsCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);

  // Fonction pour tracker les vues réelles
  const trackView = async () => {
    if (hasViewed) return;

    try {
      // Générer un ID de session unique pour éviter les doublons
      const sessionId = `voice_post_view_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Stocker dans localStorage pour éviter les vues multiples par session
      const localViewsKey = `voice_post_viewed_${id}`;
      if (localStorage.getItem(localViewsKey)) {
        // Déjà vu dans cette session
        setHasViewed(true);
        return;
      }

      // Marquer comme vu dans localStorage
      localStorage.setItem(localViewsKey, 'true');

      // Incrémenter le compteur local immédiatement pour une réponse instantanée
      setViewsCount(prev => prev + 1);
      setHasViewed(true);

      console.log(`👁️ Vue trackée pour le post vocal ${id}`);

      // TODO: Synchronisation avec la base de données quand la fonction RPC sera créée
      // Pour l'instant, on utilise seulement le compteur local

    } catch (error) {
      console.error('Erreur lors du tracking de la vue:', error);
    }
  };

  const { user } = useAuth();
  const { getComments, addComment, deleteVoicePost } = useVoicePosts();

  // Vérifier si l'utilisateur est le propriétaire du post
  const isOwner = user?.id === user_id;

  // Intersection Observer pour auto-play et vues
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            setIsVisible(true);
            // Tracker la vue quand le post devient visible
            if (!hasViewed) {
              trackView();
            }
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.7 } // 70% visible pour déclencher
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasViewed]);

  // Auto-play quand visible
  useEffect(() => {
    if (isVisible && !isPlaying && !isAutoPlaying) {
      const timer = setTimeout(() => {
        if (audioRef.current && isVisible) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            setIsAutoPlaying(true);
            setListenStartTime(Date.now());
          }).catch(() => {
            // Auto-play bloqué par navigateur, pas grave
          });
        }
      }, 500); // Délai pour éviter les conflits

      return () => clearTimeout(timer);
    } else if (!isVisible && (isPlaying || isAutoPlaying)) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsAutoPlaying(false);
        // Signaler le temps d'écoute
        if (listenStartTime) {
          const listenDuration = Date.now() - listenStartTime;
          onListen(id, listenDuration / 1000, false);
          setListenStartTime(null);
        }
      }
    }
  }, [isVisible, isPlaying, isAutoPlaying, id, onListen, listenStartTime]);

  // Fonction de partage - ouvre le ShareDialog
  const handleShare = () => {
    setShareDialogOpen(true);
  };

  // Fonctions pour le propriétaire
  const handleEdit = () => {
    toast.info('Fonctionnalité de modification à venir');
    // TODO: Implémenter la modification de post vocal
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce post vocal ?')) return;

    try {
      await deleteVoicePost(id);
      toast.success('Post vocal supprimé');
      // Le composant parent devra gérer la suppression de la liste
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Générer des ondes professionnelles
  const generateWaveform = (samples: number = 100) => {
    if (waveform_data && Array.isArray(waveform_data)) {
      return waveform_data.slice(0, samples);
    }
    // Générer des ondes plus réalistes avec variation
    return Array.from({ length: samples }, (_, index) => {
      const baseHeight = 0.3;
      const variation = Math.sin((index / samples) * Math.PI * 4) * 0.4;
      const noise = (Math.random() - 0.5) * 0.2;
      return Math.max(0.1, Math.min(1, baseHeight + variation + noise));
    });
  };

  const waveformBars = generateWaveform();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || audio_duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setIsAutoPlaying(false);
      // Signaler l'écoute complète
      onListen(id, audio.duration, true);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => {});
    };
  }, [id, onListen]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsAutoPlaying(false);
      // Signaler le temps d'écoute
      if (listenStartTime) {
        const listenDuration = Date.now() - listenStartTime;
        onListen(id, listenDuration / 1000, false);
        setListenStartTime(null);
      }
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setIsAutoPlaying(false);
        setListenStartTime(Date.now());
      });
    }
  };

  // Gestion des commentaires
  const handleCommentClick = async () => {
    if (!showComments) {
      // Charger les commentaires
      setLoadingComments(true);
      try {
        const fetchedComments = await getComments(id);
        setComments(fetchedComments);
      } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment(id, newComment.trim());
      setNewComment('');

      // Recharger les commentaires
      const updatedComments = await getComments(id);
      setComments(updatedComments);

      // Mettre à jour le compteur de commentaires localement
      // (Cela sera synchronisé lors du prochain rafraîchissement du feed)
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
    }
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const formatTime = (time: number) => {
    // Protection contre les valeurs invalides
    if (!isFinite(time) || isNaN(time) || time < 0) {
      return '0:00';
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      {/* Header avec avatar et info utilisateur */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-pink-500/20">
            <AvatarImage src={avatar_url || undefined} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-base">{name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              @{username} · {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-8 h-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-3" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                <Trash2 className="w-4 h-4 mr-3" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Titre du post vocal */}
      {title && (
        <div className="px-4 pb-3">
          <h3 className="text-gray-900 dark:text-white font-medium text-base leading-relaxed">
            {title}
          </h3>
        </div>
      )}

      {/* Player audio professionnel - Format large comme vidéo */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black mx-4 mb-4 rounded-2xl overflow-hidden shadow-2xl">
        {/* Overlay de contrôle */}
        <div className="absolute inset-0 bg-black/20 z-10" />

        {/* Bouton play central */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Button
            onClick={togglePlayPause}
            className="w-20 h-20 rounded-full bg-white/90 hover:bg-white text-black shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
            size="lg"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
        </div>

        {/* Indicateur auto-play */}
        {isAutoPlaying && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 z-20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">Lecture automatique</span>
            </div>
          </div>
        )}

        {/* Ondes visuelles professionnelles */}
        <div className="relative p-8 flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-1 w-full max-w-md">
            {waveformBars.map((height, index) => {
              const isActive = progress > 0 && (index / waveformBars.length) * 100 <= progress;
              const isCurrent = Math.abs((index / waveformBars.length) * 100 - progress) < 1;

              return (
                <div
                  key={index}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'bg-pink-400 shadow-lg shadow-pink-500/50'
                      : isActive
                      ? 'bg-white/80'
                      : 'bg-white/30'
                  }`}
                  style={{
                    height: `${Math.max(4, height * 80)}px`,
                    transform: isCurrent ? 'scaleY(1.2)' : 'scaleY(1)',
                    boxShadow: isCurrent ? '0 0 20px rgba(236, 72, 153, 0.6)' : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Barre de progression en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Contrôles en bas à droite */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white text-xs font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Audio element caché */}
        <audio
          ref={audioRef}
          src={audio_url}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      </div>

      {/* Statistiques et actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{viewsCount > 0 ? viewsCount : 0} vue{viewsCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className={`w-4 h-4 ${user_liked ? 'text-red-500 fill-current' : ''}`} />
              <span>{likes_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{comments_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Volume2 className="w-4 h-4" />
              <span>{listens_count} écoutes</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            🎵 AUDIO
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onLike(id)}
            className={`flex-1 gap-2 rounded-lg transition-all duration-200 ${
              user_liked
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Heart className={`w-5 h-5 ${user_liked ? 'fill-current' : ''}`} />
            <span className="font-medium">J'aime</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleCommentClick}
            className="flex-1 gap-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Commenter</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleShare}
            className="flex-1 gap-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Share className="w-5 h-5" />
            <span className="font-medium">Partager</span>
          </Button>
        </div>
      </div>

      {/* Section commentaires avec design moderne */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 pt-4">
          <div className="space-y-4">
            {/* Liste des commentaires */}
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500" />
                <span className="ml-2 text-gray-500">Chargement...</span>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun commentaire pour le moment</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={comment.avatar_url || undefined} alt={comment.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                          {comment.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                            {comment.name}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Champ d'ajout de commentaire moderne */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.name || 'Vous'} />
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm font-semibold">
                    {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Écrivez un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={handleCommentKeyPress}
                    className="flex-1 rounded-full border-gray-300 dark:border-gray-600 focus:border-pink-500 focus:ring-pink-500"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="rounded-full bg-pink-500 hover:bg-pink-600 text-white px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ShareDialog pour les posts vocaux */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentType="post"
        contentId={id}
        contentData={{
          content: title || 'Message vocal',
          title: title,
          user_name: name,
          user_avatar: avatar_url || undefined,
        }}
      />
    </div>
  );
};
