import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, RotateCw, ZoomIn, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { supabase } from '@/integrations/supabase/client';

interface CoverPhotoEditorProps {
  currentCover: string | null;
  userId: string;
  onCoverUpdate: () => void;
  trigger?: React.ReactNode;
}


export function CoverPhotoEditor({ currentCover, userId, onCoverUpdate, trigger }: CoverPhotoEditorProps) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
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
    if (!imageSrc || !croppedAreaPixels) {
      toast.error('Aucune image à enregistrer');
      return;
    }

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      const fileName = `cover_${userId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_photo_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Ensure system albums exist
      await supabase.rpc('ensure_system_albums', { user_id_param: userId });

      // Get the cover photos album
      const { data: album } = await supabase
        .from('photo_albums')
        .select('id')
        .eq('user_id', userId)
        .eq('system_album', 'cover_photos')
        .single();

      if (album) {
        // Add photo to album
        await supabase.from('photos').insert({
          user_id: userId,
          album_id: album.id,
          image_url: publicUrl,
          caption: 'Photo de couverture',
          privacy: 'public'
        });

        // Update album cover
        await supabase
          .from('photo_albums')
          .update({ cover_photo_url: publicUrl })
          .eq('id', album.id);
      }

      // Create a post for the cover photo update
      const { data: newPost, error: postError } = await supabase.from('posts')
        .insert({
          user_id: userId,
          content: "a mis à jour sa photo de couverture",
          media_url: publicUrl,
          media_type: 'image',
          privacy: 'public'
        })
        .select()
        .single();

      if (postError) throw postError;

      // Insert into post_media table
      if (newPost) {
        await supabase.from('post_media').insert({
          post_id: newPost.id,
          media_url: publicUrl,
          media_type: 'image',
          order_index: 0
        });
      }

      toast.success('Photo de couverture mise à jour');
      onCoverUpdate();
      setOpen(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUploading(false);
    }
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

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Photo de couverture</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!imageSrc ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                variant="outline"
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-12 h-12" />
                  <span>Choisir une image (16:9 recommandé)</span>
                </div>
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full h-80 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
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
              </div>

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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setImageSrc(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
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
