import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface VideosSectionProps {
  userId: string;
}

export const VideosSection = ({ userId }: VideosSectionProps) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ['profile-videos', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_media')
        .select('media_url, created_at, post_id')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by user posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);

      const postIds = posts?.map(p => p.id) || [];
      return data.filter(video => postIds.includes(video.post_id));
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          Aucune vidéo
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video, index) => (
          <div
            key={index}
            className="aspect-video rounded-lg overflow-hidden cursor-pointer group relative bg-black"
            onClick={() => setSelectedVideo(video.media_url)}
          >
            <video
              src={video.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
              <Play className="h-12 w-12 text-white" fill="white" />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          {selectedVideo && (
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};