import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Image, Video, Upload } from 'lucide-react';

interface CreateStoryProps {
  onCreateStory: (file: File, textOverlay?: {
    text: string;
    text_position: { x: number; y: number };
    text_color: string;
    text_size: number;
  }) => void;
  children?: React.ReactNode;
  uploadProgress?: number;
  isUploading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreateStory = ({ 
  onCreateStory, 
  children, 
  uploadProgress = 0, 
  isUploading = false,
  open,
  onOpenChange 
}: CreateStoryProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCreateStory(file);
      if (e.target) {
        e.target.value = ''; // Reset input
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Partagez un moment qui disparaîtra dans 24 heures
          </p>

          {isUploading ? (
            <div className="space-y-6 p-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <Upload className="h-12 w-12 text-primary animate-pulse" />
                  <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Téléchargement en cours...</p>
                  <p className="text-2xl font-bold text-primary">{uploadProgress}%</p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-3 transition-all duration-300" />
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  {uploadProgress < 30 && "Préparation du fichier..."}
                  {uploadProgress >= 30 && uploadProgress < 70 && "Téléchargement en cours..."}
                  {uploadProgress >= 70 && uploadProgress < 95 && "Finalisation..."}
                  {uploadProgress >= 95 && "Publication..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-3"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image className="w-8 h-8 text-primary" />
                <span>Photo</span>
              </Button>

              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-3"
                onClick={() => videoInputRef.current?.click()}
              >
                <Video className="w-8 h-8 text-primary" />
                <span>Vidéo</span>
              </Button>
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <p className="text-xs text-muted-foreground text-center">
            Format acceptés: JPG, PNG, MP4, MOV
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
