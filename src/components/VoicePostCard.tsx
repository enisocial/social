import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  MoreVertical,
  Headphones,
  Clock,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VoicePost } from '@/hooks/useVoicePosts';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface VoicePostCardProps {
  voicePost: VoicePost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onRecordListen: (postId: string, duration: number, completed: boolean) => void;
}

export const VoicePostCard: React.FC<VoicePostCardProps> = ({
  voicePost,
  onLike,
  onComment,
  onShare,
  onDelete,
  onRecordListen
}) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voicePost.audio_duration || 0);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const isOwner = user?.id === voicePost.user_id;

  // Safety checks for required data
  if (!voicePost || !voicePost.audio_url) {
    console.error('VoicePostCard: Missing required voicePost data');
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Erreur: Données du post vocal manquantes</p>
      </div>
    );
  }

  // Format duration for display
  const formatTime = (seconds: number) => {
    // Handle invalid values
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlayback = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        // setIsPlaying(false) will be handled by 'pause' event listener
      } else {
        // Preload first 3 seconds if not started yet
        if (!hasStartedPlaying) {
          audioRef.current.preload = 'metadata';
          setHasStartedPlaying(true);
        }
        await audioRef.current.play();
        // setIsPlaying(true) will be handled by 'play' event listener
      }
    } catch (error) {
      // Reset state on error
      setIsPlaying(false);
    }
  };

  // Stable event handlers using useCallback
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Record completed listen
    if (audioRef.current) {
      onRecordListen(voicePost.id, audioRef.current.duration, true);
    }
  }, [voicePost.id, onRecordListen]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Record partial listen
    if (audioRef.current && audioRef.current.currentTime > 0) {
      onRecordListen(voicePost.id, audioRef.current.currentTime, false);
    }
  }, [voicePost.id, onRecordListen]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handlePlay, handleEnded, handlePause]);

  // Seek functionality
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const newTime = (clickX / progressWidth) * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Render waveform visualization
  const renderWaveform = () => {
    if (!voicePost.waveform_data || !Array.isArray(voicePost.waveform_data)) {
      // Fallback waveform
      return (
        <div className="flex items-center space-x-0.5 h-8">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="bg-primary/60 rounded-full w-1 flex-1 min-h-[2px]"
              style={{
                height: `${Math.random() * 100}%`,
                opacity: isPlaying ? 0.8 : 0.4
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-0.5 h-8">
        {voicePost.waveform_data.map((amplitude, i) => {
          const progress = duration > 0 && isFinite(duration) ? currentTime / duration : 0;
          const isPlayed = duration > 0 && isFinite(duration) ? (i / voicePost.waveform_data.length) <= progress : false;

          return (
            <div
              key={i}
              className={`rounded-full w-1 min-h-[2px] transition-all duration-150 ${
                isPlayed ? 'bg-primary' : 'bg-primary/40'
              }`}
              style={{
                height: `${Math.max((amplitude || 0) * 100, 10)}%`,
                opacity: isPlaying ? (isPlayed ? 1 : 0.6) : (isPlayed ? 0.8 : 0.4)
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={voicePost.audio_url}
        preload="none" // Optimized for mobile
        className="hidden"
      />

      {/* Header avec design professionnel */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12 ring-2 ring-purple-200/50 dark:ring-purple-700/50 shadow-md">
                <AvatarImage src={voicePost.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {voicePost.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de statut */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-base">{voicePost.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(voicePost.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </p>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-9 h-9 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl">
                <DropdownMenuItem
                  onClick={() => onDelete?.(voicePost.id)}
                  className="text-red-600 cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  <span className="font-medium">Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Titre stylisé */}
        {voicePost.title && (
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-base mt-3 leading-tight">
            {voicePost.title}
          </h3>
        )}
      </div>

      {/* Content principal */}
      <div className="px-5 pb-5">
        {/* Audio Player moderne */}
        <div className="relative bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-5 mb-5 shadow-inner border border-gray-200/50 dark:border-gray-600/30">
          {/* Bouton play central stylisé */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative group">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePlayback();
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center border-0 cursor-pointer relative z-20"
                style={{
                  pointerEvents: 'auto',
                  zIndex: 20,
                  position: 'relative'
                }}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1" />
                )}
              </button>
              {/* Glow effect */}
              <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none z-10"></div>
            </div>
          </div>

          {/* Métriques audio */}
          <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-purple-600" />
              <span className="font-semibold">{voicePost.listens_count.toLocaleString()}</span>
              <span>écoutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Waveform Visualization moderne */}
          <div
            ref={progressRef}
            className="cursor-pointer mb-4 p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl backdrop-blur-sm"
            onClick={handleProgressClick}
          >
            {renderWaveform()}
          </div>

          {/* Barre de progression moderne */}
          <div className="relative mb-3">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-300 shadow-lg relative"
                style={{
                  width: duration > 0 && isFinite(duration) ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-sm opacity-50"></div>
              </div>
            </div>
          </div>

          {/* Indicateurs de temps stylisés */}
          <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">{formatTime(currentTime)}</span>
            <span className="bg-pink-100 dark:bg-pink-900/30 px-3 py-1 rounded-full">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Actions principales modernes */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onLike(voicePost.id)}
            className={`flex-1 h-12 gap-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              voicePost.user_liked
                ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-700/50 shadow-lg shadow-red-500/20'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600/50 hover:shadow-lg hover:shadow-red-500/10'
            }`}
          >
            <Heart className={`w-5 h-5 transition-all duration-300 ${voicePost.user_liked ? 'fill-current scale-110' : ''}`} />
            <span>{voicePost.likes_count.toLocaleString()}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => onComment(voicePost.id)}
            className="flex-1 h-12 gap-3 rounded-xl font-semibold bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{voicePost.comments_count.toLocaleString()}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => onShare(voicePost.id)}
            className="flex-1 h-12 gap-3 rounded-xl font-semibold bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-2 border-gray-200/50 dark:border-gray-600/50 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-600/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 transform hover:scale-105"
          >
            <Share2 className="w-5 h-5" />
            <span>Partager</span>
          </Button>
        </div>

        {/* Transcript premium */}
        {voicePost.transcript && (
          <div className="mt-5 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/30 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">Transcription</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic text-sm">
                  "{voicePost.transcript}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
