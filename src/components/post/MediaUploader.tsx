import { X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MediaUploaderProps {
  files: File[];
  setFiles: (files: File[]) => void;
  previews: string[];
  setPreviews: (previews: string[]) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const MediaUploader = ({ files, setFiles, previews, setPreviews, inputRef }: MediaUploaderProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    
    if (files.length + newFiles.length > 10) {
      toast.error('Maximum 10 médias par publication');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    const invalidFiles = newFiles.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Type de fichier non supporté');
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    const oversizedFiles = newFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast.error('Fichier trop volumineux (max 100MB)');
      return;
    }

    setFiles([...files, ...newFiles]);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  return (
    <div>
      <input
        ref={inputRef}
        id="media-input"
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {previews.length > 0 && (
        <div className={`grid gap-2 ${
          previews.length === 1 ? 'grid-cols-1' :
          previews.length === 2 ? 'grid-cols-2' :
          previews.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {files[index].type.startsWith('video') ? (
                <video src={preview} className="w-full h-full object-cover" />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {previews.length < 10 && (
            <button
              type="button"
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex items-center justify-center transition-colors"
              onClick={() => document.getElementById('media-input')?.click()}
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};