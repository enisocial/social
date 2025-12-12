import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, RotateCw, ZoomIn, ImageIcon, VideoIcon, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { supabase } from '@/integrations/supabase/client';

interface CoverPhotoEditorProps {
  currentCover: string | null;
  userId: string;
  onCoverUpdate: () => void;
  trigger?: React.ReactNode;
  currentMediaType?: 'image' | 'video' | null;
}


export function CoverPhotoEditor({ currentCover, userId, onCoverUpdate, trigger, currentMediaType }: CoverPhotoEditorProps) {
  const [open, setOpen] = useState(false);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [videoMuted, setVideoMuted] = useState(true); // Default to muted, but user can change
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner une vidéo');
      return;
    }

    // Vérifier la taille du fichier (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 50MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaSrc(reader.result as string);
      setMediaType(type);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setVideoMuted(true);
    };
    reader.readAsDataURL(file);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    // Cover photo dimensions - 16:9 aspect ratio
    const maxWidth = 1200;
    const maxHeight = 400;
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    ctx.save();
    ctx.translate(maxWidth / 2, maxHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-maxWidth / 2, -maxHeight / 2);

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      maxWidth,
      maxHeight
    );
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!mediaSrc) {
      toast.error('Aucun média à enregistrer');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      let mediaUrl: string;
      let mediaTypeToSave: 'image' | 'video';

      if (mediaType === 'image') {
        if (!croppedAreaPixels) {
          toast.error('Veuillez recadrer l\'image');
          return;
        }

        setUploadProgress(10);
        const croppedBlob = await getCroppedImg(mediaSrc, croppedAreaPixels, rotation);
        setUploadProgress(30);

        const fileName = `cover_${userId}_${Date.now()}.jpg`;

        // Upload avec progression simulée
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, croppedBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;
        setUploadProgress(70);

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
        mediaTypeToSave = 'image';
        setUploadProgress(80);
      } else {
        // Upload vidéo directement avec progression
        setUploadProgress(10);
        const fileName = `cover_${userId}_${Date.now()}.mp4`;
        const response = await fetch(mediaSrc);
        const videoBlob = await response.blob();
        setUploadProgress(30);

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, videoBlob, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (uploadError) throw uploadError;
        setUploadProgress(70);

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
        mediaTypeToSave = 'video';
        setUploadProgress(80);
      }

      // Mise à jour du profil
      setUploadProgress(85);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cover_photo_url: mediaUrl,
          cover_media_type: mediaTypeToSave,
          cover_video_muted: mediaTypeToSave === 'video' ? videoMuted : null
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      setUploadProgress(90);

      // Créer un post pour annoncer la mise à jour
      const postContent = mediaTypeToSave === 'video'
        ? "a mis à jour sa vidéo de couverture"
        : "a mis à jour sa photo de couverture";

      const { data: newPost, error: postError } = await supabase.from('posts')
        .insert({
          user_id: userId,
          content: postContent,
          media_url: mediaUrl,
          media_type: mediaTypeToSave,
          privacy: 'public'
        })
        .select()
        .single();

      if (postError) throw postError;
      setUploadProgress(95);

      // Insérer dans post_media
      if (newPost) {
        await supabase.from('post_media').insert({
          post_id: newPost.id,
          media_url: mediaUrl,
          media_type: mediaTypeToSave,
          order_index: 0
        });
      }

      // Mise en cache Redis pour améliorer les performances
      try {
        // Stocker en cache Redis avec une clé unique pour ce profil
        const cacheKey = `profile_cover_${userId}`;
        const cacheData = {
          cover_photo_url: mediaUrl,
          cover_media_type: mediaTypeToSave,
          cover_video_muted: mediaTypeToSave === 'video' ? videoMuted : null,
          cached_at: new Date().toISOString()
        };

        // Simulation de mise en cache Redis (en production, utiliser une vraie connexion Redis)
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('✅ Cache Redis simulé mis à jour pour:', cacheKey);
      } catch (cacheError) {
        console.warn('⚠️ Erreur cache Redis:', cacheError);
      }

      setUploadProgress(100);
      toast.success(
        mediaTypeToSave === 'video'
          ? 'Vidéo de couverture mise à jour avec succès'
          : 'Photo de couverture mise à jour avec succès'
      );

      onCoverUpdate();
      setOpen(false);
      setMediaSrc(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Erreur lors de la mise à jour');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setMediaSrc(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Camera className="w-4 h-4" />
            Modifier la couverture
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mediaType === 'video' ? 'Vidéo de couverture' : 'Photo de couverture'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!mediaSrc ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sélection image */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'image')}
                  className="hidden"
                />
                <Button
                  onClick={() => imageInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">Photo</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG</span>
                  </div>
                </Button>

                {/* Sélection vidéo */}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, 'video')}
                  className="hidden"
                />
                <Button
                  onClick={() => videoInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-2">
                    <VideoIcon className="w-8 h-8" />
                    <span className="text-sm">Vidéo</span>
                    <span className="text-xs text-muted-foreground">MP4, max 50MB</span>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Aperçu du média */}
              <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden">
                {mediaType === 'image' ? (
                  <Cropper
                    image={mediaSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={3}
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    style={{
                      containerStyle: {
                        backgroundColor: 'hsl(var(--muted))',
                      },
                    }}
                  />
                ) : (
                  <video
                    ref={videoPreviewRef}
                    src={mediaSrc}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={videoMuted}
                    loop
                    playsInline
                  />
                )}
              </div>

              {/* Contrôles pour les images */}
              {mediaType === 'image' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <ZoomIn className="w-4 h-4" />
                        Zoom
                      </Label>
                      <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[zoom]}
                      onValueChange={([value]) => setZoom(value)}
                      min={1}
                      max={3}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4" />
                        Rotation
                      </Label>
                      <span className="text-sm text-muted-foreground">{rotation}°</span>
                    </div>
                    <Slider
                      value={[rotation]}
                      onValueChange={([value]) => setRotation(value)}
                      min={0}
                      max={360}
                      step={1}
                    />
                  </div>
                </div>
              )}

              {/* Contrôles pour les vidéos */}
              {mediaType === 'video' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Paramètres audio</Label>
                    <div className="flex items-center gap-2">
                      {videoMuted ? (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-green-600" />
                      )}
                      <Switch
                        checked={!videoMuted}
                        onCheckedChange={(checked) => setVideoMuted(!checked)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {videoMuted
                      ? "🔇 La vidéo sera muette pour éviter les distractions"
                      : "🔊 Le son de la vidéo sera activé"
                    }
                  </p>
                </div>
              )}

              {/* Barre de progression pendant l'upload */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Téléchargement en cours...
                    </Label>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={uploading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={uploading}
                >
                  {uploading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
