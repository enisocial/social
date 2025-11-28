import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { PhotoViewer } from '@/components/PhotoViewer';

interface PhotosSectionProps {
  userId: string;
}

export const PhotosSection = ({ userId }: PhotosSectionProps) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Fetch photos only from posts (no duplication)
  const { data: photos, isLoading } = useQuery({
    queryKey: ['profile-photos', userId],
    queryFn: async () => {
      // Get user's posts first
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) return [];

      // Get media for these posts
      const { data, error } = await supabase
        .from('post_media')
        .select('media_url, created_at, post_id')
        .eq('media_type', 'image')
        .in('post_id', posts.map(p => p.id))
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          Aucune photo
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedPhotoIndex(index)}
          >
            <img
              src={photo.media_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {selectedPhotoIndex !== null && (
        <PhotoViewer
          open={true}
          onOpenChange={() => setSelectedPhotoIndex(null)}
          photoUrl={photos[selectedPhotoIndex].media_url}
        />
      )}
    </>
  );
};
