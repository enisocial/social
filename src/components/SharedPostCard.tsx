import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from './PostCard';

interface SharedPostCardProps {
  share: {
    id: string;
    post_id: string;
    share_message: string | null;
    created_at: string;
    shared_by_profile: {
      id: string;
      name: string;
      username: string;
      avatar_url: string | null;
    };
  };
}

export const SharedPostCard = ({ share }: SharedPostCardProps) => {
  const { data: post, isLoading } = useQuery({
    queryKey: ['shared-post', share.post_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!user_id(username, name, avatar_url),
          likes(user_id),
          comments(id)
        `)
        .eq('id', share.post_id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !post) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <PostCard
      post={{
        ...post,
        edit_history: post.edit_history as any
      }}
      sharedBy={share.shared_by_profile}
      shareMessage={share.share_message || undefined}
    />
  );
};
