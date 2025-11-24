import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, RotateCw, ZoomIn, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { supabase } from '@/integrations/supabase/client';

interface AvatarEditorProps {
  currentAvatar: string | null;
  userName: string;
  userId: string;
  onAvatarUpdate: () => void;
}

interface Filter {
  name: string;
  value: string;
  apply: (ctx: CanvasRenderingContext2D) => void;
}

const filters: Filter[] = [
  { 
    name: 'Original', 
    value: 'none',
    apply: () => {}
  },
  { 
    name: 'Noir & Blanc', 
    value: 'grayscale(100%)',
    apply: () => {}
  },
  { 
    name: 'Vintage', 
    value: 'sepia(60%) contrast(1.1) brightness(1.05)',
    apply: () => {}
  },
  { 
    name: 'Sépia', 
    value: 'sepia(100%)',
    apply: () => {}
  },
  { 
    name: 'Lumière douce', 
    value: 'brightness(1.15) contrast(0.95) saturate(1.1)',
    apply: () => {}
  },
  { 
    name: 'Haute luminosité', 
    value: 'brightness(1.3) contrast(1.1)',
    apply: () => {}
  },
  { 
    name: 'Contraste fort', 
    value: 'contrast(1.5) saturate(1.2)',
    apply: () => {}
  },
  { 
    name: 'Flou artistique', 
    value: 'blur(1px) brightness(1.05)',
    apply: () => {}
  },
  { 
    name: 'Netteté +', 
    value: 'contrast(1.3) saturate(1.15) brightness(1.05)',
    apply: () => {}
  },
  { 
    name: 'Bleu', 
    value: 'saturate(1.2) hue-rotate(180deg) brightness(1.1)',
    apply: () => {}
  },
  { 
    name: 'Rosé', 
    value: 'saturate(1.3) hue-rotate(-10deg) brightness(1.1) contrast(1.05)',
    apply: () => {}
  },
  { 
    name: 'Doré', 
    value: 'saturate(1.4) hue-rotate(20deg) brightness(1.15) contrast(1.1)',
    apply: () => {}
  },
  { 
    name: 'Chaud', 
    value: 'saturate(1.3) hue-rotate(10deg) brightness(1.1)',
    apply: () => {}
  },
  { 
    name: 'Froid', 
    value: 'saturate(0.9) hue-rotate(-20deg) brightness(1.05)',
    apply: () => {}
  },
];

export function AvatarEditor({ currentAvatar, userName, userId, onAvatarUpdate }: AvatarEditorProps) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<Filter>(filters[0]);
  const [uploading, setUploading] = useState(false);
  const [filterThumbnails, setFilterThumbnails] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = reader.result as string;
      setImageSrc(imageUrl);
      setOriginalImageSrc(imageUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setSelectedFilter(filters[0]);
      
      // Generate filter thumbnails
      await generateFilterThumbnails(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const generateFilterThumbnails = async (imageUrl: string) => {
    const image = await createImage(imageUrl);
    const thumbnails: { [key: string]: string } = {};
    
    for (const filter of filters) {
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.filter = filter.value;
        
        const scale = Math.max(size / image.width, size / image.height);
        const x = (size - image.width * scale) / 2;
        const y = (size - image.height * scale) / 2;
        
        ctx.drawImage(image, x, y, image.width * scale, image.height * scale);
        thumbnails[filter.name] = canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    
    setFilterThumbnails(thumbnails);
  };

  const handleResetFilter = () => {
    setSelectedFilter(filters[0]);
    toast.info('Filtre réinitialisé');
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
    rotation = 0,
    filter = 'none'
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    const maxSize = 512;
    canvas.width = maxSize;
    canvas.height = maxSize;

    ctx.save();
    ctx.translate(maxSize / 2, maxSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-maxSize / 2, -maxSize / 2);

    ctx.filter = filter;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      maxSize,
      maxSize
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
        rotation,
        selectedFilter.value
      );

      const fileName = `avatar_${userId}_${Date.now()}.jpg`;
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
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Ensure system albums exist
      await supabase.rpc('ensure_system_albums', { user_id_param: userId });

      // Get the profile pictures album
      const { data: album } = await supabase
        .from('photo_albums')
        .select('id')
        .eq('user_id', userId)
        .eq('system_album', 'profile_pictures')
        .single();

      if (album) {
        // Add photo to album
        await supabase.from('photos').insert({
          user_id: userId,
          album_id: album.id,
          image_url: publicUrl,
          caption: 'Photo de profil',
          privacy: 'public'
        });

        // Update album cover
        await supabase
          .from('photo_albums')
          .update({ cover_photo_url: publicUrl })
          .eq('id', album.id);
      }

      // Create a post for the profile picture update
      const { data: newPost, error: postError } = await supabase.from('posts')
        .insert({
          user_id: userId,
          content: "a mis à jour sa photo de profil",
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

      toast.success('Avatar mis à jour avec succès');
      onAvatarUpdate();
      setOpen(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors de la mise à jour de l\'avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          <Avatar className="w-24 h-24 border-4 border-primary/20 transition-all group-hover:border-primary/40">
            <AvatarImage src={currentAvatar || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {userName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnaliser l'avatar</DialogTitle>
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
                className="w-full h-32 border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                variant="outline"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" />
                  <span>Choisir une image</span>
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
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  style={{
                    containerStyle: {
                      backgroundColor: 'hsl(var(--muted))',
                      filter: selectedFilter.value,
                    },
                    mediaStyle: {
                      filter: selectedFilter.value,
                    },
                  }}
                />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  {selectedFilter.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez un filtre ci-dessous
                </p>
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Filtres photo
                    </Label>
                    {selectedFilter.name !== 'Original' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilter}
                        className="h-7 text-xs"
                      >
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 pb-2">
                    {filters.map((filter) => (
                      <button
                        key={filter.name}
                        onClick={() => setSelectedFilter(filter)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          selectedFilter.name === filter.name
                            ? 'border-primary ring-2 ring-primary/30 shadow-lg'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {filterThumbnails[filter.name] ? (
                          <img
                            src={filterThumbnails[filter.name]}
                            alt={filter.name}
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-muted animate-pulse" />
                        )}
                        <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-background/90 backdrop-blur-sm px-1 py-1 font-medium">
                          {filter.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setImageSrc(null);
                    setOriginalImageSrc(null);
                    setFilterThumbnails({});
                    setSelectedFilter(filters[0]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={uploading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  onClick={handleSave}
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enregistrement...
                    </span>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
