import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
        setIsPlaying(false);
      } else {
        // Preload first 3 seconds if not started yet
        if (!hasStartedPlaying) {
          audioRef.current.preload = 'metadata';
          await audioRef.current.play();
          setHasStartedPlaying(true);
        } else {
          await audioRef.current.play();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Record completed listen
      onRecordListen(voicePost.id, duration, true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      // Record partial listen
      if (currentTime > 0) {
        onRecordListen(voicePost.id, currentTime, false);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [voicePost.id, duration, currentTime, onRecordListen]);

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
          const progress = currentTime / duration;
          const isPlayed = (i / voicePost.waveform_data.length) <= progress;

          return (
            <div
              key={i}
              className={`rounded-full w-1 min-h-[2px] transition-all duration-150 ${
                isPlayed ? 'bg-primary' : 'bg-primary/40'
              }`}
              style={{
                height: `${Math.max(amplitude * 100, 10)}%`,
                opacity: isPlaying ? (isPlayed ? 1 : 0.6) : (isPlayed ? 0.8 : 0.4)
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={voicePost.audio_url}
        preload="none" // Optimized for mobile
        className="hidden"
      />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={voicePost.avatar_url || ''} />
              <AvatarFallback>
                {voicePost.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{voicePost.name}</p>
              <p className="text-xs text-muted-foreground">
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
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onDelete?.(voicePost.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {voicePost.title && (
          <h3 className="font-medium text-sm mt-2">{voicePost.title}</h3>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Audio Player */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          {/* Play/Pause Button */}
          <div className="flex items-center justify-between mb-3">
            <Button
              onClick={togglePlayback}
              size="sm"
              className="rounded-full w-12 h-12"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Headphones className="w-3 h-3" />
              <span>{voicePost.listens_count}</span>
              <Clock className="w-3 h-3 ml-2" />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Waveform Visualization */}
          <div
            ref={progressRef}
            className="cursor-pointer mb-2"
            onClick={handleProgressClick}
          >
            {renderWaveform()}
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-muted rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(voicePost.id)}
              className={`flex items-center space-x-1 ${
                voicePost.user_liked ? 'text-red-500' : ''
              }`}
            >
              <Heart
                className={`w-4 h-4 ${voicePost.user_liked ? 'fill-current' : ''}`}
              />
              <span className="text-sm">{voicePost.likes_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment(voicePost.id)}
              className="flex items-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{voicePost.comments_count}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(voicePost.id)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Transcript (if available) */}
        {voicePost.transcript && (
          <div className="mt-3 p-3 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground italic">
              "{voicePost.transcript}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
