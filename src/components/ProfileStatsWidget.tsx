import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Eye, Heart, MessageSquare, TrendingUp } from 'lucide-react';

interface ProfileStatsWidgetProps {
  userId: string;
}

export const ProfileStatsWidget = ({ userId }: ProfileStatsWidgetProps) => {
  const { data: analytics } = useQuery({
    queryKey: ['user-analytics', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_analytics', {
        user_id_param: userId,
        days_param: 30
      });
      if (error) throw error;
      return data[0];
    }
  });

  const { data: dailyEngagement } = useQuery({
    queryKey: ['daily-engagement', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_engagement', {
        user_id_param: userId,
        days_param: 7
      });
      if (error) throw error;
      return data;
    }
  });

  const { data: topPosts } = useQuery({
    queryKey: ['top-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_posts', {
        user_id_param: userId,
        limit_param: 5
      });
      if (error) throw error;
      return data;
    }
  });

  if (!analytics) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-48 bg-muted rounded"></div>
      </Card>
    );
  }

  const statsCards = [
    { label: 'Likes reçus', value: analytics.total_likes, icon: Heart, color: 'text-pink-500' },
    { label: 'Commentaires', value: analytics.total_comments, icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Vues', value: analytics.total_views, icon: Eye, color: 'text-purple-500' },
    { label: 'Taux d\'engagement', value: `${analytics.avg_engagement_rate}%`, icon: TrendingUp, color: 'text-green-500' }
  ];

  const engagementData = dailyEngagement?.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
    likes: day.likes_count,
    comments: day.comments_count,
    vues: day.views_count
  })) || [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-background ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Engagement sur 7 jours</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Line type="monotone" dataKey="likes" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line type="monotone" dataKey="comments" stroke="hsl(var(--secondary))" strokeWidth={2} />
            <Line type="monotone" dataKey="vues" stroke="hsl(var(--accent))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {topPosts && topPosts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Publications les plus populaires</h3>
          <div className="space-y-3">
            {topPosts.slice(0, 3).map((post: any, index: number) => (
              <div key={post.post_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{post.content}</p>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {post.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {post.views_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
