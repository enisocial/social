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

  // Fetch photos from posts
  const { data: postPhotos, isLoading: loadingPosts } = useQuery({
    queryKey: ['profile-post-photos', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_media')
        .select('media_url, created_at, post_id')
        .eq('media_type', 'image')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by user posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      const postIds = posts?.map(p => p.id) || [];
      return data.filter(photo => postIds.includes(photo.post_id));
    }
  });

  // Fetch photos from photo_albums
  const { data: albumPhotos, isLoading: loadingAlbums } = useQuery({
    queryKey: ['profile-album-photos', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('image_url, created_at, caption')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const allPhotos = [
    ...(postPhotos?.map(p => ({ url: p.media_url, date: p.created_at })) || []),
    ...(albumPhotos?.map(p => ({ url: p.image_url, date: p.created_at })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = loadingPosts || loadingAlbums;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (allPhotos.length === 0) {
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
        {allPhotos.map((photo, index) => (
          <div
            key={index}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedPhotoIndex(index)}
          >
            <img
              src={photo.url}
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
          photoUrl={allPhotos[selectedPhotoIndex].url}
        />
      )}
    </>
  );
};