import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { PostFilters } from '@/components/post/PostFilters';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProfilePostsSectionProps {
  userId: string;
  onPostDelete: () => void;
}

export const ProfilePostsSection = ({ userId, onPostDelete }: ProfilePostsSectionProps) => {
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos' | 'tagged'>('all');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['profile-posts', userId, filter],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles(username, name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filter === 'all') {
        query = query.eq('user_id', userId);
      } else if (filter === 'tagged') {
        // Get posts where user is tagged
        const { data: taggedPosts } = await supabase
          .from('post_tags')
          .select('post_id')
          .eq('tagged_user_id', userId);
        
        const postIds = taggedPosts?.map(t => t.post_id) || [];
        if (postIds.length === 0) return [];
        
        query = query.in('id', postIds);
      } else {
        // Photos or videos from post_media
        const { data: mediaPosts } = await supabase
          .from('post_media')
          .select('post_id')
          .eq('media_type', filter === 'photos' ? 'image' : 'video');
        
        const postIds = mediaPosts?.map(m => m.post_id) || [];
        if (postIds.length === 0) return [];
        
        query = query.eq('user_id', userId).in('id', postIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(post => ({
        ...post,
        username: post.profiles?.username,
        name: post.profiles?.name,
        avatar_url: post.profiles?.avatar_url
      }));
    },
    enabled: !!userId
  });

  return (
    <div>
      <PostFilters activeFilter={filter} onFilterChange={setFilter} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            {filter === 'all' ? 'Aucune publication' :
             filter === 'photos' ? 'Aucune photo' :
             filter === 'videos' ? 'Aucune vidéo' :
             'Aucune identification'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <EnhancedPostCard 
              key={post.id} 
              post={post}
              onDelete={onPostDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};