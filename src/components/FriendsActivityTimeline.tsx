import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Image as ImageIcon, Calendar, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Activity {
  id: string;
  type: 'new_friend' | 'new_post' | 'birthday' | 'like';
  user: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  created_at: string;
  metadata?: any;
}

export const FriendsActivityTimeline = ({ userId }: { userId: string }) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['friends-activity', userId],
    queryFn: async () => {
      // Get user's friends
      const { data: friendsData } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, sender:profiles!friend_requests_sender_id_fkey(*), receiver:profiles!friend_requests_receiver_id_fkey(*)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted')
        .limit(50);

      if (!friendsData) return [];

      const friendIds = friendsData.map(fr => 
        fr.sender_id === userId ? fr.receiver_id : fr.sender_id
      );

      if (friendIds.length === 0) return [];

      // Get recent activities
      const activities: Activity[] = [];

      // New friend connections (last 7 days)
      const { data: recentFriends } = await supabase
        .from('friend_requests')
        .select('*, sender:profiles!friend_requests_sender_id_fkey(*), receiver:profiles!friend_requests_receiver_id_fkey(*)')
        .in('sender_id', friendIds)
        .eq('status', 'accepted')
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      recentFriends?.forEach(fr => {
        if (fr.sender_id !== userId && friendIds.includes(fr.sender_id)) {
          activities.push({
            id: `friend-${fr.id}`,
            type: 'new_friend',
            user: fr.sender as any,
            created_at: fr.updated_at || fr.created_at,
            metadata: { friendName: (fr.receiver as any)?.name }
          });
        }
      });

      // Recent posts with media
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .in('user_id', friendIds)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      recentPosts?.forEach(post => {
        activities.push({
          id: `post-${post.id}`,
          type: 'new_post',
          user: post.profiles as any,
          created_at: post.created_at,
          metadata: { postId: post.id, mediaUrl: post.media_url }
        });
      });

      // Upcoming birthdays (next 30 days)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)
        .not('birthdate', 'is', null);

      profiles?.forEach(profile => {
        if (profile.birthdate) {
          const birthday = new Date(profile.birthdate);
          const today = new Date();
          birthday.setFullYear(today.getFullYear());
          
          const daysUntil = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0 && daysUntil <= 30) {
            activities.push({
              id: `birthday-${profile.id}`,
              type: 'birthday',
              user: profile as any,
              created_at: birthday.toISOString(),
              metadata: { daysUntil }
            });
          }
        }
      });

      // Sort by date
      return activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 20);
    },
    enabled: !!userId,
    refetchInterval: 60000 // Refresh every minute
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_friend': return <UserPlus className="h-4 w-4" />;
      case 'new_post': return <ImageIcon className="h-4 w-4" />;
      case 'birthday': return <Calendar className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'new_friend':
        return `est maintenant ami avec ${activity.metadata?.friendName}`;
      case 'new_post':
        return 'a publié une nouvelle photo';
      case 'birthday':
        const days = activity.metadata?.daysUntil;
        return days === 0 ? 'fête son anniversaire aujourd\'hui 🎉' : 
               days === 1 ? 'fête son anniversaire demain 🎂' :
               `fête son anniversaire dans ${days} jours`;
      default:
        return 'a une nouvelle activité';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">
          Aucune activité récente de vos amis
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Activités récentes
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link 
              to={`/profile/${activity.user.username}`}
              className="flex gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.user.avatar_url || ''} />
                <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{activity.user.name}</span>{' '}
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    activity.type === 'birthday' ? 'bg-yellow-500/10' :
                    activity.type === 'new_friend' ? 'bg-blue-500/10' :
                    'bg-primary/10'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
