import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LinkPreviewProps {
  preview: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
  onRemove: () => void;
}

export const LinkPreview = ({ preview, onRemove }: LinkPreviewProps) => {
  return (
    <Card className="overflow-hidden relative group">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
      
      {preview.image && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img 
            src={preview.image} 
            alt={preview.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="text-xs text-muted-foreground truncate mb-1">
          {new URL(preview.url).hostname}
        </div>
        <div className="font-semibold line-clamp-1">{preview.title}</div>
        {preview.description && (
          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {preview.description}
          </div>
        )}
      </div>
    </Card>
  );
};