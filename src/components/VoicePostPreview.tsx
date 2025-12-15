import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [lastListenUpdate, setLastListenUpdate] = useState<number>(0);
  const [hasBeenManuallyControlled, setHasBeenManuallyControlled] = useState(false);
  const [hasAutoPlayedOnce, setHasAutoPlayedOnce] = useState(false);

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
  }, []); // Remove hasViewed from dependencies to prevent infinite loop

  // Stable callback for handling audio state changes
  const handleAudioStateChange = useCallback(() => {
    if (audioRef.current) {
      if (!isVisible && (isPlaying || isAutoPlaying)) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsAutoPlaying(false);
        // Signaler le temps d'écoute avec debounce
        if (listenStartTime) {
          const listenDuration = Date.now() - listenStartTime;
          const now = Date.now();
          if (now - lastListenUpdate > 2000) { // Only update every 2 seconds
            onListen(id, listenDuration / 1000, false);
            setLastListenUpdate(now);
          }
          setListenStartTime(null);
        }
      }
    }
  }, [isVisible, isPlaying, isAutoPlaying, listenStartTime, lastListenUpdate, id, onListen]);

  // Auto-play quand visible (une seule fois)
  useEffect(() => {
    if (isVisible && !isPlaying && !isAutoPlaying && !hasAutoPlayedOnce && !hasBeenManuallyControlled) {
      const timer = setTimeout(() => {
        if (audioRef.current && isVisible && !hasAutoPlayedOnce && !hasBeenManuallyControlled) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            setIsAutoPlaying(true);
            setHasAutoPlayedOnce(true);
            setListenStartTime(Date.now());
          }).catch(() => {
            // Auto-play bloqué par navigateur, pas grave
          });
        }
      }, 500); // Délai pour éviter les conflits

      return () => clearTimeout(timer);
    }
  }, [isVisible, isPlaying, isAutoPlaying, hasAutoPlayedOnce, hasBeenManuallyControlled]);

  // Handle visibility changes separately
  useEffect(() => {
    handleAudioStateChange();
  }, [handleAudioStateChange]);

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

    // Marquer comme contrôlé manuellement dès la première interaction
    setHasBeenManuallyControlled(true);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsAutoPlaying(false);
      // Signaler le temps d'écoute avec debounce
      if (listenStartTime) {
        const listenDuration = Date.now() - listenStartTime;
        const now = Date.now();
        if (now - lastListenUpdate > 2000) { // Only update every 2 seconds
          onListen(id, listenDuration / 1000, false);
          setLastListenUpdate(now);
        }
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
    <div ref={containerRef} className="bg-gradient-to-br from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 mb-8 overflow-hidden backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Header avec avatar et info utilisateur - Design professionnel */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-14 h-14 ring-4 ring-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-lg">
              <AvatarImage src={avatar_url || undefined} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white font-bold text-lg shadow-inner">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Indicateur de statut */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-gray-900 shadow-md"></div>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              @{username}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-10 h-10 p-0 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                <Edit className="w-4 h-4 mr-3 text-blue-600" />
                <span className="font-medium">Modifier</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                <Trash2 className="w-4 h-4 mr-3" />
                <span className="font-medium">Supprimer</span>
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

      {/* Player audio ultra-moderne - Design professionnel inspiré de Spotify */}
      <div className="relative mx-6 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/20">
        {/* Fond animé subtil */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/5 to-blue-600/10 animate-pulse"></div>

        {/* Bouton play central avec design premium */}
        <div className="relative z-20 flex items-center justify-center py-12 px-8">
          <div className="relative group">
            {/* Anneau extérieur animé */}
            <div className={`absolute inset-0 rounded-full border-4 transition-all duration-500 ${
              isPlaying
                ? 'border-green-400/50 scale-110 shadow-lg shadow-green-400/20'
                : 'border-white/30 group-hover:border-white/50 group-hover:scale-105'
            }`}></div>

            {/* Bouton principal */}
            <Button
              onClick={togglePlayPause}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 hover:from-gray-50 hover:to-white text-slate-900 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white/20"
              size="lg"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 drop-shadow-sm" />
              ) : (
                <Play className="w-10 h-10 ml-1 drop-shadow-sm" />
              )}
            </Button>
          </div>
        </div>

        {/* Indicateur auto-play moderne */}
        {isAutoPlaying && (
          <div className="absolute top-6 left-6 z-30 bg-gradient-to-r from-green-500 to-emerald-500 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-semibold tracking-wide">LECTURE AUTO</span>
            </div>
          </div>
        )}

        {/* Ondes visuelles ultra-modernes */}
        <div className="relative px-8 pb-8 flex items-center justify-center">
          <div className="flex items-center gap-0.5 w-full max-w-lg">
            {waveformBars.map((height, index) => {
              const isActive = progress > 0 && (index / waveformBars.length) * 100 <= progress;
              const isCurrent = Math.abs((index / waveformBars.length) * 100 - progress) < 1;
              const isNearCurrent = Math.abs((index / waveformBars.length) * 100 - progress) < 2;

              return (
                <div
                  key={index}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-t from-pink-400 to-purple-400 shadow-lg shadow-pink-500/50'
                      : isNearCurrent
                      ? 'bg-gradient-to-t from-purple-300 to-pink-300'
                      : isActive
                      ? 'bg-white/90'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  style={{
                    height: `${Math.max(6, height * 120)}px`,
                    transform: isCurrent ? 'scaleY(1.3) scaleX(1.2)' : isNearCurrent ? 'scaleY(1.1)' : 'scaleY(1)',
                    boxShadow: isCurrent ? '0 0 25px rgba(236, 72, 153, 0.8), 0 0 50px rgba(147, 51, 234, 0.4)' : 'none',
                    filter: isCurrent ? 'brightness(1.2) contrast(1.1)' : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Barre de progression moderne */}
        <div className="relative mx-8 mb-6">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-300 shadow-lg relative"
              style={{ width: `${progress}%` }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-sm opacity-50"></div>
            </div>
          </div>

          {/* Indicateur de temps stylisé */}
          <div className="flex justify-between items-center mt-3 text-xs font-semibold tracking-wider">
            <span className="text-white/80 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {formatTime(currentTime)}
            </span>
            <span className="text-white/60">
              {formatTime(duration)}
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

      {/* Statistiques et actions ultra-modernes */}
      <div className="px-6 pb-6">
        {/* Métriques avec design professionnel */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            {/* Vues avec icône moderne */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group">
              <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {viewsCount > 0 ? viewsCount.toLocaleString() : '0'}
              </span>
              <span className="text-gray-500 dark:text-gray-500 text-xs">
                vue{viewsCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Likes avec animation */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group">
              <div className={`p-1.5 rounded-full transition-all duration-200 ${
                user_liked
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-gray-50 dark:bg-gray-800/50 group-hover:bg-red-50 dark:group-hover:bg-red-900/20'
              }`}>
                <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${
                  user_liked
                    ? 'text-red-500 fill-current scale-110'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-red-500 group-hover:scale-110'
                }`} />
              </div>
              <span className={`font-semibold transition-colors ${
                user_liked ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {likes_count.toLocaleString()}
              </span>
              <span className="text-gray-500 dark:text-gray-500 text-xs">like{likes_count !== 1 ? 's' : ''}</span>
            </div>

            {/* Commentaires */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group">
              <div className="p-1.5 rounded-full bg-green-50 dark:bg-green-900/20 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {comments_count.toLocaleString()}
              </span>
              <span className="text-gray-500 dark:text-gray-500 text-xs">commentaire{comments_count !== 1 ? 's' : ''}</span>
            </div>

            {/* Écoutes */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group">
              <div className="p-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                <Volume2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {listens_count.toLocaleString()}
              </span>
              <span className="text-gray-500 dark:text-gray-500 text-xs">écoute{listens_count !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Badge audio premium */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full border border-purple-200/50 dark:border-purple-700/50">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 tracking-wide">
              AUDIO
            </span>
          </div>
        </div>

        {/* Actions principales avec design premium */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => onLike(id)}
            className={`flex-1 h-12 gap-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              user_liked
                ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-700/50 shadow-lg shadow-red-500/20'
                : 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600/50 hover:shadow-lg hover:shadow-red-500/10'
            }`}
          >
            <Heart className={`w-5 h-5 transition-all duration-300 ${user_liked ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
            <span>J'aime</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleCommentClick}
            className="flex-1 h-12 gap-3 rounded-xl font-semibold bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Commenter</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleShare}
            className="flex-1 h-12 gap-3 rounded-xl font-semibold bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-600/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 transform hover:scale-105"
          >
            <Share className="w-5 h-5" />
            <span>Partager</span>
          </Button>
        </div>
      </div>

      {/* Section commentaires ultra-moderne */}
      {showComments && (
        <div className="border-t border-gradient-to-r from-purple-200/50 via-pink-200/50 to-blue-200/50 dark:border-gradient-to-r dark:from-purple-700/30 dark:via-pink-700/30 dark:to-blue-700/30 px-6 pt-6">
          <div className="space-y-6">
            {/* Liste des commentaires avec design premium */}
            {loadingComments ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 dark:border-purple-700"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-purple-500"></div>
                </div>
                <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">Chargement des commentaires...</span>
              </div>
            ) : (
              <div className="space-y-5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent">
                {comments.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl border border-gray-100/50 dark:border-gray-700/50">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aucun commentaire</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                      Soyez le premier à partager votre avis sur ce post vocal !
                    </p>
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className={`flex gap-4 group hover:bg-gradient-to-r hover:from-transparent hover:via-purple-50/30 hover:to-transparent dark:hover:via-purple-900/10 p-4 rounded-2xl transition-all duration-300 ${
                        index === comments.length - 1 ? '' : 'border-b border-gray-100/50 dark:border-gray-700/30'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12 ring-2 ring-purple-200/50 dark:ring-purple-700/50 shadow-md">
                          <AvatarImage src={comment.avatar_url || undefined} alt={comment.name} />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-inner">
                            {comment.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicateur de statut */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-700/80 rounded-2xl px-5 py-4 shadow-sm border border-gray-100/50 dark:border-gray-600/30 group-hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                              {comment.name}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-600/50 px-2 py-0.5 rounded-full font-medium">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Champ d'ajout de commentaire ultra-moderne */}
            <div className="border-t border-gradient-to-r from-purple-200/50 via-pink-200/50 to-blue-200/50 dark:border-gradient-to-r dark:from-purple-700/30 dark:via-pink-700/30 dark:to-blue-700/30 pt-6">
              <div className="bg-gradient-to-br from-white/80 to-gray-50/60 dark:from-gray-800/80 dark:to-gray-700/60 rounded-2xl p-5 shadow-lg border border-gray-100/50 dark:border-gray-600/30 backdrop-blur-sm">
                <div className="flex gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-pink-200/50 dark:ring-pink-700/50 shadow-md">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.name || 'Vous'} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold shadow-inner">
                        {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Indicateur de statut */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  </div>
                  <div className="flex-1 flex gap-3 items-end">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Partagez votre pensée..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleCommentKeyPress}
                        className="w-full pr-12 py-3 px-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm shadow-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 font-medium transition-all duration-200"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                        {newComment.length}/500
                      </div>
                    </div>
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || newComment.length > 500}
                      className="h-12 px-6 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Publier
                    </Button>
                  </div>
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
