import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformStats {
  totalUsers: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  totalPosts: number;
  postsToday: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  engagementRate: number;
  moderationQueueSize: number;
  bannedUsers: number;
  reportsToday: number;
}

export interface ChartData {
  name: string;
  users: number;
  posts: number;
  engagement: number;
}

export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);

    // Fetch all stats in parallel
    const [
      usersData,
      postsData,
      commentsData,
      likesData,
      sharesData,
      queueData,
      bannedData,
      reportsData,
      weeklyData
    ] = await Promise.all([
      supabase.from('profiles').select('created_at', { count: 'exact', head: true }),
      supabase.from('posts').select('created_at', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('share_count'),
      supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      fetchWeeklyData()
    ]);

    const totalUsers = usersData.count || 0;
    const totalPosts = postsData.count || 0;
    const totalComments = commentsData.count || 0;
    const totalLikes = likesData.count || 0;
    const totalShares = sharesData.data?.reduce((acc, post) => acc + (post.share_count || 0), 0) || 0;

    // Calculate active users today
    const { count: activeToday } = await supabase
      .from('posts')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Calculate posts today
    const { count: postsToday } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Calculate new users this week
    const { count: newUsersWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const engagementRate = totalPosts > 0 
      ? ((totalLikes + totalComments + totalShares) / totalPosts) * 100 
      : 0;

    setStats({
      totalUsers,
      activeUsersToday: activeToday || 0,
      newUsersThisWeek: newUsersWeek || 0,
      totalPosts,
      postsToday: postsToday || 0,
      totalComments,
      totalLikes,
      totalShares,
      engagementRate: Math.round(engagementRate * 100) / 100,
      moderationQueueSize: queueData.count || 0,
      bannedUsers: bannedData.count || 0,
      reportsToday: reportsData.count || 0
    });

    setChartData(weeklyData);
    setLoading(false);
  };

  const fetchWeeklyData = async (): Promise<ChartData[]> => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const data: ChartData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

      const [users, posts, likes, comments] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('likes').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('comments').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay)
      ]);

      data.push({
        name: days[date.getDay()],
        users: users.count || 0,
        posts: posts.count || 0,
        engagement: (likes.count || 0) + (comments.count || 0)
      });
    }

    return data;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, chartData, loading, refetch: fetchStats };
};
