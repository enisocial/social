import React, { useState } from 'react';
import { X, Image as ImageIcon, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MediaUploaderProps {
  files: File[];
  setFiles: (files: File[]) => void;
  previews: string[];
  setPreviews: (previews: string[]) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const MediaUploader = ({ files, setFiles, previews, setPreviews, inputRef }: MediaUploaderProps) => {
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<number, 'idle' | 'uploading' | 'completed' | 'error'>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    if (files.length + newFiles.length > 10) {
      toast.error('Maximum 10 médias par publication');
      // reset input so user can re-select same file later
      if (e.target) e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    const invalidFiles = newFiles.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast.error('Type de fichier non supporté');
      if (e.target) e.target.value = '';
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    const oversizedFiles = newFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('Fichier trop volumineux (max 100MB)');
      if (e.target) e.target.value = '';
      return;
    }

    // create previews and append files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    const startIndex = files.length;

    setFiles([...files, ...newFiles]);
    setPreviews([...previews, ...newPreviews]);

    // Initialize upload status for new files
    const newUploadStatus: Record<number, 'idle' | 'uploading' | 'completed' | 'error'> = {};
    const newUploadProgress: Record<number, number> = {};

    newFiles.forEach((_, idx) => {
      const fileIndex = startIndex + idx;
      newUploadStatus[fileIndex] = 'idle';
      newUploadProgress[fileIndex] = 0;
    });

    setUploadStatus(prev => ({ ...prev, ...newUploadStatus }));
    setUploadProgress(prev => ({ ...prev, ...newUploadProgress }));

    // Simulate upload progress for visual feedback
    newFiles.forEach((file, idx) => {
      const fileIndex = startIndex + idx;
      setUploadStatus(prev => ({ ...prev, [fileIndex]: 'uploading' }));

      // Simulate progressive upload
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          setUploadStatus(prev => ({ ...prev, [fileIndex]: 'completed' }));
          clearInterval(interval);
        }
        setUploadProgress(prev => ({ ...prev, [fileIndex]: Math.round(progress) }));
      }, 200 + Math.random() * 300);
    });

    // reset input so same file can be selected again
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    // revoke URL to avoid memory leak
    if (previews[index]) {
      try { URL.revokeObjectURL(previews[index]); } catch (e) { /* noop */ }
    }
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));

    // Clean up upload states
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[index];
      return newStatus;
    });
  };

  // cleanup all previews on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
      });
    };
  }, [previews]);

  return (
    <div>
      <input
        ref={inputRef}
        id="media-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              {/* Facebook-style small preview */}
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                {files[index].type.startsWith('video') ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover bg-black"
                    preload="metadata"
                    muted
                  />
                ) : (
                  <img
                    src={preview}
                    alt={files[index].name ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Upload progress overlay */}
              {uploadStatus[index] === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="w-full px-2">
                    <Progress value={uploadProgress[index] || 0} className="h-1 mb-1" />
                    <div className="flex items-center justify-center gap-1 text-white text-xs">
                      <Upload className="h-3 w-3" />
                      <span>{uploadProgress[index] || 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success indicator */}
              {uploadStatus[index] === 'completed' && (
                <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {previews.length < 10 && (
            <button
              type="button"
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex items-center justify-center transition-colors"
              onClick={() => document.getElementById('media-input')?.click()}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
