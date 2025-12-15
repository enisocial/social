import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  X,
  Volume2,
  Settings,
  CheckCircle
} from 'lucide-react';
import { useVoicePosts } from '@/hooks/useVoicePosts';
import { useAudioDevices } from '@/hooks/useAudioDevices';
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

  // Audio device management
  const {
    devices,
    loading: devicesLoading,
    error: devicesError,
    selectedDeviceId,
    setSelectedDeviceId,
    getAudioStream,
    getBestMicrophone
  } = useAudioDevices();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<string>('');
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(0); // Force display update

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const MAX_DURATION = 60; // 60 seconds max

  // Start recording with automatic microphone selection
  const startRecording = useCallback(async () => {
    console.log('🎤 START RECORDING - DÉBUT DE FONCTION');

    // WRAPPER GLOBAL POUR CAPTURER TOUTES LES ERREURS
    try {
      console.log('🎤 DÉBUT ENREGISTREMENT AVEC MICRO SÉLECTIONNÉ');
      setIsRecording(true); // Set recording state immediately to avoid UI freeze
      console.log('✅ État isRecording défini à true');

      // Debug: Afficher le micro sélectionné
      const bestDevice = getBestMicrophone();
      console.log('🎯 Meilleur micro détecté:', bestDevice);

      // Utiliser le micro sélectionné automatiquement
      console.log('📡 Obtention du stream audio...');
      const stream = await getAudioStream();
      console.log('✅ Stream audio obtenu');

      // Vérifier que le stream est valide
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('Aucun stream audio valide obtenu');
      }
      console.log('✅ Stream validé');

      // Obtenir les informations du périphérique actuel
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();

        console.log('🎤 TRACK INFO:', {
          label: track.label,
          deviceId: settings.deviceId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          readyState: track.readyState
        });

        setCurrentDeviceInfo(track.label || 'Microphone inconnu');

        // Vérifier si c'est vraiment le bon micro
        const isUsingBestDevice = bestDevice && settings.deviceId === bestDevice.deviceId;
        console.log('🔍 Utilise le meilleur micro ?', isUsingBestDevice);

        // Afficher une notification du micro utilisé
        if (bestDevice?.isExternal && isUsingBestDevice) {
          toast.success(`🎤 Micro externe utilisé: ${bestDevice.label}`, {
            duration: 4000,
          });
          console.log('✅ MICRO EXTERNE RÉELLEMENT UTILISÉ !');
        } else if (bestDevice?.isExternal && !isUsingBestDevice) {
          toast.warning(`⚠️ Micro externe détecté mais pas utilisé: ${track.label}`, {
            duration: 4000,
          });
          console.log('❌ MICRO EXTERNE DÉTECTÉ MAIS PAS UTILISÉ !');
        } else {
          toast.info(`🎤 Micro utilisé: ${track.label || 'Par défaut'}`, {
            duration: 3000,
          });
          console.log('📱 MICRO UTILISÉ');
        }
      }

      // Créer le MediaRecorder avec gestion d'erreur
      let mediaRecorder: MediaRecorder;
      console.log('🎬 Création MediaRecorder...');
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus' // Optimized for compression
        });
        console.log('✅ MediaRecorder créé avec opus');
      } catch (recorderError) {
        console.warn('⚠️ Codec opus non supporté, tentative avec fallback');
        // Fallback pour navigateurs qui ne supportent pas opus
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        console.log('✅ MediaRecorder créé avec fallback webm');
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      console.log('✅ MediaRecorder configuré');

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Données audio reçues:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 ENREGISTREMENT ARRÊTÉ - Traitement final');
        console.log('🔍 VALEURS ACTUELLES:', {
          recordingStartTime,
          recordingTime,
          DateNow: Date.now()
        });

        try {
          console.log('📦 Création du blob audio...');
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm'
          });
          const url = URL.createObjectURL(audioBlob);

          // Calculate final duration accurately using ref for reliability
          let finalDurationSeconds: number;
          const startTimeRef = recordingStartTimeRef.current;
          if (startTimeRef) {
            finalDurationSeconds = Math.max(1, Math.floor((Date.now() - startTimeRef) / 1000));
            console.log('⏱️ DURÉE CALCULÉE depuis startTimeRef:', finalDurationSeconds, 'secondes');
          } else if (recordingStartTime) {
            finalDurationSeconds = Math.max(1, Math.floor((Date.now() - recordingStartTime) / 1000));
            console.log('⏱️ DURÉE CALCULÉE depuis recordingStartTime state:', finalDurationSeconds, 'secondes');
          } else {
            finalDurationSeconds = Math.max(1, recordingTime);
            console.log('⏱️ DURÉE CALCULÉE depuis recordingTime (fallback):', finalDurationSeconds, 'secondes');
          }

          console.log('🎵 Blob créé, mise à jour état...');

          // CRITICAL: Update states in correct order
          console.log('🔄 MISE À JOUR ÉTATS - Durée finale:', finalDurationSeconds);

          // Update in this specific order to ensure proper display
          setFinalDuration(finalDurationSeconds);
          console.log('✅ setFinalDuration appelé avec:', finalDurationSeconds);

          setRecordingCompleted(true);
          console.log('✅ setRecordingCompleted appelé avec: true');

          // Force display update with a separate state
          setDisplayDuration(finalDurationSeconds);
          console.log('✅ setDisplayDuration forcé avec:', finalDurationSeconds);

          setAudioBlob(audioBlob);
          setAudioUrl(url);
          setIsRecording(false);
          setRecordingTime(0);
          setRecordingStartTime(null);

          console.log('✅ TOUS ÉTATS MIS À JOUR - Affichage devrait montrer:', finalDurationSeconds, 'secondes');

          // Stop all tracks
          console.log('🔇 Arrêt des tracks audio...');
          stream.getTracks().forEach(track => track.stop());
          setCurrentDeviceInfo('');

          toast.success('Enregistrement terminé !', { duration: 2000 });

        } catch (stopError) {
          console.error('❌ ERREUR CRITIQUE lors de l\'arrêt:', stopError);
          setIsRecording(false);
          toast.error('Erreur lors de la finalisation de l\'enregistrement');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ ERREUR MediaRecorder:', event);
        setIsRecording(false);
        toast.error('Erreur d\'enregistrement audio');
      };

      // Démarrer l'enregistrement
      console.log('🎬 DÉMARRAGE ENREGISTREMENT...');
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime; // Store in ref for reliable access
      setRecordingStartTime(startTime); // Also update state for consistency
      mediaRecorder.start(1000); // Collect data every second
      setRecordingTime(0);
      console.log('✅ MediaRecorder.start() appelé');

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(prev => {
          if (elapsed >= MAX_DURATION) {
            console.log('⏰ DURÉE MAX ATTEINTE - Arrêt automatique');
            stopRecording();
            return prev;
          }
          return elapsed;
        });
      }, 100); // Update more frequently for better accuracy
      console.log('✅ Timer démarré');

      console.log('✅ ENREGISTREMENT DÉMARRÉ AVEC SUCCÈS - TOUT FONCTIONNE !');

    } catch (error) {
      console.error('❌ ERREUR CRITIQUE GLOBALE:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');

      // Reset ALL states on error
      setIsRecording(false);
      setRecordingTime(0);
      setCurrentDeviceInfo('');

      // Cleanup any existing recorder
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('⚠️ Cleanup error (normal):', e);
        }
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'enregistrement';
      toast.error(`Erreur d'enregistrement: ${errorMessage}`, { duration: 5000 });
      console.log('❌ Toast d\'erreur affiché à l\'utilisateur');
    }
  }, [getAudioStream, getBestMicrophone]);

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
    setFinalDuration(0);
    setDisplayDuration(0); // Reset display duration too
    setRecordingStartTime(null);
    recordingStartTimeRef.current = null; // Reset ref too
    setRecordingCompleted(false);
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
    console.log('🎤 PUBLISH - Validation des données...');
    console.log('AudioBlob exists:', !!audioBlob);
    console.log('FinalDuration:', finalDuration);
    console.log('RecordingCompleted:', recordingCompleted);

    if (!audioBlob) {
      toast.error('Aucun audio à publier');
      return;
    }

    // Use the most reliable duration available
    const durationToUse = recordingCompleted ? finalDuration : recordingTime;
    console.log('Duration to use for validation:', durationToUse);

    if (durationToUse < 1) {
      toast.error('L\'enregistrement est trop court');
      return;
    }

    try {
      console.log('🎤 Starting voice post creation...');
      const result = await createVoicePost(
        audioBlob,
        title.trim() || undefined,
        (progress) => {
          console.log('Upload progress:', progress + '%');
        },
        durationToUse
      );

      if (result) {
        console.log('✅ Voice post created successfully:', result);
        toast.success('Post vocal publié avec succès ! 🎉');
      } else {
        console.error('❌ Voice post creation returned null/undefined');
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
  }, [audioBlob, finalDuration, recordingTime, recordingCompleted, title, createVoicePost, onSuccess, onClose, navigate]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('🔍 STATE DEBUG:', {
      recordingCompleted,
      finalDuration,
      recordingTime,
      isRecording,
      audioBlob: !!audioBlob
    });
  }, [recordingCompleted, finalDuration, recordingTime, isRecording, audioBlob]);

  // Force re-render when recording completes
  React.useEffect(() => {
    if (recordingCompleted && finalDuration > 0) {
      console.log('🎯 RECORDING COMPLETED - Force re-render with duration:', finalDuration);
      // Force a re-render by updating a dummy state
      setTimeout(() => {
        console.log('✅ Display should now show:', formatTime(finalDuration));
      }, 100);
    }
  }, [recordingCompleted, finalDuration]);

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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Utiliser des unités safe pour mobile (éviter les barres d'adresse)
        height: '100svh',
        minHeight: '100vh',
        // Forcer l'affichage sur mobile
        WebkitTransform: 'translateZ(0)', // Force hardware acceleration
        transform: 'translateZ(0)',
        willChange: 'transform',
        // Éviter les problèmes de scroll sur iOS
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none'
      }}
    >
      <Card
        className="w-full max-w-md mx-auto relative shadow-2xl"
        style={{
          zIndex: 10000,
          // Utiliser des unités safe pour mobile avec fallbacks
          maxHeight: 'min(90dvh, 90svh, 90vh)',
          // Forcer l'affichage au-dessus de tout
          position: 'relative',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          // Style pour mobile
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
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
                  <span>Durée: {formatTime(recordingCompleted ? displayDuration : recordingTime)}</span>
                </span>
                <span>Taille: {(audioBlob.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>
          )}

          {/* Microphone Selection */}
          {!audioBlob && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Microphone
                  </Label>
                </div>
                {devicesLoading && (
                  <div className="text-xs text-muted-foreground">Chargement...</div>
                )}
              </div>

              {/* Current Device Info */}
              {currentDeviceInfo && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-300">
                    {currentDeviceInfo}
                  </span>
                </div>
              )}

              {/* Device Selection */}
              {devices.length > 1 && (
                <div className="space-y-2">
                  <Select
                    value={selectedDeviceId || ''}
                    onValueChange={setSelectedDeviceId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          <div className="flex items-center space-x-2">
                            <span>{device.label}</span>
                            {device.isExternal && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                Externe
                              </span>
                            )}
                            {device.priority > 50 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Recommandé
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Best Device Info */}
              {devices.length > 0 && !devicesLoading && (
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const bestDevice = getBestMicrophone();
                    if (bestDevice?.isExternal) {
                      return `🎤 Micro externe détecté automatiquement: ${bestDevice.label}`;
                    } else if (bestDevice) {
                      return `🎤 Micro sélectionné: ${bestDevice.label}`;
                    }
                    return '🎤 Aucun microphone trouvé';
                  })()}
                </div>
              )}

              {/* Error Display */}
              {devicesError && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                  ⚠️ Erreur micros: {devicesError}
                </div>
              )}
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
