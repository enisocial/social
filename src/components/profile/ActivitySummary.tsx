import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Heart, MessageCircle, Eye, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActivitySummaryProps {
  userId: string;
}

export const ActivitySummary = ({ userId }: ActivitySummaryProps) => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['activity-summary', userId],
    queryFn: async () => {
      const [postsResult, friendsResult, recentActivity] = await Promise.all([
        // Stats générales
        supabase
          .from('posts')
          .select('id, created_at, likes(count), comments(count)', { count: 'exact' })
          .eq('user_id', userId),

        // Amis récents
        supabase
          .from('friend_requests')
          .select(`
            id,
            sender_id,
            receiver_id,
            updated_at,
            sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
            receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
          `)
          .eq('status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('updated_at', { ascending: false })
          .limit(5),

        // Activité récente
        supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            likes(count),
            comments(count)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const totalPosts = postsResult.count || 0;
      const recentFriends = friendsResult.data?.slice(0, 3).map(req => {
        const friend = req.sender_id === userId ? req.receiver : req.sender;
        return {
          ...friend,
          friendship_date: req.updated_at
        };
      }) || [];

      return {
        totalPosts,
        recentFriends,
        recentPosts: recentActivity.data || [],
        engagement: {
          totalLikes: recentActivity.data?.reduce((sum, post) => sum + (post.likes?.[0]?.count || 0), 0) || 0,
          totalComments: recentActivity.data?.reduce((sum, post) => sum + (post.comments?.[0]?.count || 0), 0) || 0
        }
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* Résumé d'activité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{summary.totalPosts}</div>
              <div className="text-sm text-muted-foreground">Publications</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.engagement.totalLikes}</div>
              <div className="text-sm text-muted-foreground">Likes reçus</div>
            </div>
          </div>

          {summary.recentPosts.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Publications récentes</h4>
              <div className="space-y-2">
                {summary.recentPosts.map((post: any) => (
                  <div key={post.id} className="flex items-center justify-between text-sm">
                    <Link to={`/post/${post.id}`} className="truncate flex-1 hover:underline">
                      {post.content || 'Publication avec média'}
                    </Link>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes?.[0]?.count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.comments?.[0]?.count || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amis récents */}
      {summary.recentFriends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Amis récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recentFriends.map((friend) => (
                <Link
                  key={friend.id}
                  to={`/profile/${friend.username}`}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url || ''} />
                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{friend.name}</div>
                    <div className="text-sm text-muted-foreground">@{friend.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
