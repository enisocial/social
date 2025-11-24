import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, TrendingDown, Users, Heart, MessageSquare, Eye, 
  BarChart3, Calendar, Clock, Award 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function Analytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30');
  const [overview, setOverview] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    const { data: overviewData } = await supabase.rpc('get_user_analytics', {
      user_id_param: user.id,
      days_param: parseInt(timeRange)
    });
    if (overviewData && overviewData.length > 0) {
      setOverview(overviewData[0]);
    }

    const { data: dailyEngagement } = await supabase.rpc('get_daily_engagement', {
      user_id_param: user.id,
      days_param: parseInt(timeRange)
    });
    if (dailyEngagement) {
      setDailyData(dailyEngagement.map((d: any) => ({
        ...d,
        date: format(new Date(d.date), 'dd MMM', { locale: fr })
      })));
    }

    const { data: topPostsData } = await supabase.rpc('get_top_posts', {
      user_id_param: user.id,
      limit_param: 5
    });
    if (topPostsData) {
      setTopPosts(topPostsData);
    }

    const { data: hourlyData } = await supabase.rpc('get_activity_by_hour', {
      user_id_param: user.id
    });
    if (hourlyData) {
      setHourlyActivity(hourlyData.map((d: any) => ({
        hour: `${d.hour_of_day}h`,
        posts: d.activity_count
      })));
    }
  };

  if (loading || !user || !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const engagementData = [
    { name: 'Likes', value: overview.total_likes },
    { name: 'Commentaires', value: overview.total_comments },
    { name: 'Vues', value: overview.total_views },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">Suivez vos performances et votre croissance</p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              {overview.posts_growth > 0 ? (
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+{overview.posts_growth}%</span>
                </div>
              ) : overview.posts_growth < 0 ? (
                <div className="flex items-center gap-1 text-red-500">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{overview.posts_growth}%</span>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mb-1">Posts Total</p>
            <p className="text-3xl font-bold text-foreground">{overview.total_posts}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              {overview.likes_growth > 0 ? (
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+{overview.likes_growth}%</span>
                </div>
              ) : overview.likes_growth < 0 ? (
                <div className="flex items-center gap-1 text-red-500">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{overview.likes_growth}%</span>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mb-1">Likes Total</p>
            <p className="text-3xl font-bold text-foreground">{overview.total_likes}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Commentaires</p>
            <p className="text-3xl font-bold text-foreground">{overview.total_comments}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Vues Total</p>
            <p className="text-3xl font-bold text-foreground">{overview.total_views}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux d'engagement moyen</p>
                <p className="text-2xl font-bold text-foreground">{overview.avg_engagement_rate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amis Total</p>
                <p className="text-2xl font-bold text-foreground">{overview.total_friends}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="engagement" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="posts">Top Posts</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Engagement Quotidien
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="likes_count" stroke="#ec4899" name="Likes" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments_count" stroke="#3b82f6" name="Commentaires" strokeWidth={2} />
                  <Line type="monotone" dataKey="views_count" stroke="#10b981" name="Vues" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Répartition de l'engagement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Posts les Plus Performants
              </h3>
              <div className="space-y-4">
                {topPosts.map((post, index) => (
                  <Card key={post.post_id} className="p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground mb-2 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {post.comments_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {post.views_count}
                          </span>
                          <span className="ml-auto">
                            Score: {post.engagement_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Activité par Heure
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Identifiez les meilleures heures pour publier
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="posts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
