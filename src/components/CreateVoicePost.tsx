import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  X,
  Volume2
} from 'lucide-react';
import { useVoicePosts } from '@/hooks/useVoicePosts';
import { toast } from 'sonner';

interface CreateVoicePostProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateVoicePost: React.FC<CreateVoicePostProps> = ({
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const {
    createVoicePost,
    uploading,
    uploadProgress
  } = useVoicePosts();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const MAX_DURATION = 60; // 60 seconds max

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Optimized for compression
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        });
        const url = URL.createObjectURL(audioBlob);

        setAudioBlob(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erreur lors du démarrage de l\'enregistrement');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  // Reset recording
  const resetRecording = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPaused(false);
  }, [stopRecording]);

  // Play preview
  const togglePreview = useCallback(() => {
    if (!previewAudioRef.current || !audioUrl) return;

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  }, [isPlayingPreview, audioUrl]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (!audioBlob) {
      toast.error('Aucun audio à publier');
      return;
    }

    if (recordingTime < 1) {
      toast.error('L\'enregistrement est trop court');
      return;
    }

    try {
      const result = await createVoicePost(
        audioBlob,
        title.trim() || undefined,
        (progress) => {
          // Progress callback - no logging in production
        },
        recordingTime
      );

      if (result) {
        toast.success('Post vocal publié avec succès ! 🎉');
      } else {
        toast.error('Une erreur inattendue s\'est produite. Veuillez réessayer.');
        return;
      }

      onSuccess?.();
      onClose();

      // Redirection automatique vers le feed
      setTimeout(() => {
        navigate('/feed');
      }, 500); // Petit délai pour que l'utilisateur voie le succès

    } catch (error) {
      console.error('❌ Error publishing voice post:', error);
      toast.error('Erreur lors de la publication du post vocal');
    }
  }, [audioBlob, recordingTime, title, createVoicePost, onSuccess, onClose, navigate]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Créer un post vocal</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Recording Interface */}
          <div className="text-center space-y-4">
            {/* Recording Status */}
            <div className="flex items-center justify-center space-x-2">
              {isRecording && !isPaused && (
                <div className="flex items-center space-x-2 text-red-500">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-medium">Enregistrement...</span>
                </div>
              )}
              {isPaused && (
                <div className="flex items-center space-x-2 text-yellow-500">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="font-medium">En pause</span>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono font-bold">
              {formatTime(recordingTime)}
            </div>

            {/* Progress Bar */}
            <Progress
              value={(recordingTime / MAX_DURATION) * 100}
              className="w-full h-2"
            />

            {/* Recording Controls */}
            <div className="flex items-center justify-center space-x-4">
              {!isRecording && !audioBlob && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              )}

              {isRecording && (
                <>
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </Button>

                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    className="rounded-full w-16 h-16"
                  >
                    <Square className="w-6 h-6" />
                  </Button>

                  <Button
                    onClick={resetRecording}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </>
              )}

              {audioBlob && !isRecording && (
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={togglePreview}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12"
                  >
                    {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <Button
                    onClick={resetRecording}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Hidden preview audio */}
          {audioUrl && (
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />
          )}

          {/* Audio Info */}
          {audioBlob && (
            <div className="bg-muted/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Volume2 className="w-4 h-4" />
                  <span>Durée: {formatTime(recordingTime)}</span>
                </span>
                <span>Taille: {(audioBlob.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>
          )}

          {/* Title Input */}
          {audioBlob && (
            <div className="space-y-2">
              <Label htmlFor="title">Titre (optionnel)</Label>
              <Input
                id="title"
                placeholder="Donnez un titre à votre post vocal..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          {/* Publish Button */}
          {audioBlob && (
            <Button
              onClick={handlePublish}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Publication en cours... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publier le post vocal
                </>
              )}
            </Button>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Compression et téléchargement...
              </p>
            </div>
          )}

          {/* Instructions */}
          {!audioBlob && (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>🎤 Appuyez sur le microphone pour commencer l'enregistrement</p>
              <p>📱 Optimisé pour la connexion mobile africaine</p>
              <p>⏱️ Durée maximale: {formatTime(MAX_DURATION)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
