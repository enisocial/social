import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface TaggedSectionProps {
  userId: string;
  onPostDelete: () => void;
}

export const TaggedSection = ({ userId, onPostDelete }: TaggedSectionProps) => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['tagged-posts', userId],
    queryFn: async () => {
      // Get posts where user is tagged
      const { data: taggedPosts } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('tagged_user_id', userId);
      
      const postIds = taggedPosts?.map(t => t.post_id) || [];
      if (postIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, name, avatar_url)
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          Aucune identification
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <EnhancedPostCard 
          key={post.id} 
          post={post}
          onDelete={onPostDelete}
        />
      ))}
    </div>
  );
};