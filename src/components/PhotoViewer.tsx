import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string;
  coverPhotoUrl?: string | null;
  userName?: string;
  caption?: string;
}

export function PhotoViewer({
  open,
  onOpenChange,
  photoUrl,
  coverPhotoUrl,
  userName,
  caption
}: PhotoViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="relative w-full h-[95vh] flex items-center justify-center">
          {/* Cover photo as background */}
          {coverPhotoUrl && (
            <div 
              className="absolute inset-0 opacity-20 blur-2xl"
              style={{
                backgroundImage: `url(${coverPhotoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}

          {/* Main photo */}
          <div className="relative z-10 max-w-full max-h-full p-8 flex flex-col items-center justify-center">
            <img
              src={photoUrl}
              alt={caption || userName || 'Photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Caption */}
            {(caption || userName) && (
              <div className="mt-4 text-center">
                {userName && (
                  <p className="text-white font-semibold text-lg mb-1">
                    {userName}
                  </p>
                )}
                {caption && (
                  <p className="text-white/80 text-sm max-w-2xl">
                    {caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
