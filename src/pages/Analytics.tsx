import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, Heart, MessageSquare, Eye,
  BarChart3, Calendar, Clock, Award, Sparkles, Target, Flame,
  Zap, Star, Crown, Activity, RefreshCw, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function Analytics() {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950">
      {/* FOND ANIMÉ ULTRA-MODERNE */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/10 via-teal-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-400/10 via-rose-400/10 to-red-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {/* HEADER ULTRA-MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              {/* ICÔNE ANIMÉE PRINCIPALE */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 1, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent"
                >
                  Mon Analytics
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl text-slate-600 dark:text-slate-300 font-medium"
                >
                  📊 Analysez vos performances personnelles et optimisez votre impact
                </motion.p>
              </div>
            </div>

            {/* SÉLECTEUR PÉRIODE ULTRA-MODERNE */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-64 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 rounded-2xl px-6 shadow-lg">
                  <SelectValue placeholder="Choisir une période" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-2xl">
                  <SelectItem value="7" className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30">
                    📅 7 derniers jours
                  </SelectItem>
                  <SelectItem value="30" className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30">
                    📊 30 derniers jours
                  </SelectItem>
                  <SelectItem value="90" className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30">
                    📈 90 derniers jours
                  </SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </div>

          {/* BADGES STATUT SYSTÈME */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap gap-3"
          >
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-full">
              <Activity className="w-4 h-4 mr-2" />
              Données en temps réel
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-4 py-2 rounded-full">
              <Target className="w-4 h-4 mr-2" />
              Insights IA
            </Badge>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-4 py-2 rounded-full">
              <TrendingUp className="w-4 h-4 mr-2" />
              Croissance optimisée
            </Badge>
          </motion.div>
        </motion.div>

        {/* CARTES MÉTRIQUES PERSONNELLES ULTRA-MODERNES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {/* PUBLICATIONS PERSONNELLES */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  {overview.posts_growth > 0 ? (
                    <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <ArrowUpRight className="h-3 w-3" />
                      +{overview.posts_growth}%
                    </div>
                  ) : overview.posts_growth < 0 ? (
                    <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <ArrowDownRight className="h-3 w-3" />
                      {overview.posts_growth}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <Minus className="h-3 w-3" />
                      Stable
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Mes publications</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {overview.total_posts}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {overview.posts_growth > 0 ? 'Croissance active' : overview.posts_growth < 0 ? 'À améliorer' : 'Stable'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* INTERACTIONS REÇUES */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/20 dark:via-pink-950/20 dark:to-red-950/20 border-2 border-rose-200/50 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-400/5 to-pink-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  {overview.likes_growth > 0 ? (
                    <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <ArrowUpRight className="h-3 w-3" />
                      +{overview.likes_growth}%
                    </div>
                  ) : overview.likes_growth < 0 ? (
                    <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <ArrowDownRight className="h-3 w-3" />
                      {overview.likes_growth}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <Minus className="h-3 w-3" />
                      Stable
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Likes reçus</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                    {overview.total_likes}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {overview.likes_growth > 0 ? 'Très apprécié' : overview.likes_growth < 0 ? 'Besoin d\'engagement' : 'Populaire'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* DISCUSSIONS ENGAGÉES */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 border-2 border-sky-200/50 dark:border-sky-800/50 hover:border-sky-300 dark:hover:border-sky-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                    <Activity className="h-3 w-3" />
                    Actif
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Commentaires reçus</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    {overview.total_comments}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                      Discussions actives
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* VISIBILITÉ TOTALE */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20 border-2 border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                    <Target className="h-3 w-3" />
                    Visible
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Vues totales</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {overview.total_views}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Excellente visibilité
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* MÉTRIQUES AVANCÉES PERSONNELLES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
        >
          {/* TAUX D'ENGAGEMENT PERSONNEL */}
          <motion.div
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-indigo-950/20 border-2 border-violet-200/50 dark:border-violet-800/50 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-300 shadow-lg hover:shadow-2xl h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      Taux d'engagement personnel
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Performance moyenne</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-center py-8">
                  <div className="text-6xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    {overview.avg_engagement_rate}%
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    {overview.avg_engagement_rate >= 5 ? '🎯 Excellente performance' :
                     overview.avg_engagement_rate >= 3 ? '📈 Bonne engagement' :
                     overview.avg_engagement_rate >= 1 ? '⚡ Engagement moyen' :
                     '📊 À améliorer'}
                  </p>
                  <div className="mt-4 w-full bg-violet-100 dark:bg-violet-900/30 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-600 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(overview.avg_engagement_rate * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* RÉSEAU SOCIAL PERSONNEL */}
          <motion.div
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 border-2 border-amber-200/50 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-300 shadow-lg hover:shadow-2xl h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      Mon réseau social
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Connexions actives</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-center py-8">
                  <div className="text-6xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                    {overview.total_friends}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    {overview.total_friends >= 50 ? '🌟 Réseau étendu' :
                     overview.total_friends >= 20 ? '🤝 Communauté active' :
                     overview.total_friends >= 10 ? '👥 Cercle d\'amis' :
                     '🌱 Réseau en croissance'}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(5, Math.ceil(overview.total_friends / 10)))].map((_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-bold"
                          style={{ zIndex: 5 - i }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      {overview.total_friends > 50 && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-500 border-2 border-white dark:border-slate-800 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ANALYSES AVANCÉES PERSONNELLES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="space-y-8"
        >
          {/* ONGLETS ULTRA-MODERNES */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.6 }}
            className="flex justify-center"
          >
            <Tabs defaultValue="engagement" className="w-full max-w-4xl">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-2 shadow-xl">
                <TabsTrigger
                  value="engagement"
                  className="rounded-xl px-8 py-4 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-slate-600/50"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Engagement
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="posts"
                  className="rounded-xl px-8 py-4 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-slate-600/50"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Top Posts
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-xl px-8 py-4 font-semibold text-sm transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-slate-600/50"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Activité
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          <Tabs defaultValue="engagement" className="space-y-8">
            {/* ONGLET ENGAGEMENT */}
            <TabsContent value="engagement" className="space-y-8">
              {/* GRAPHIQUE D'ENGAGEMENT QUOTIDIEN */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950/50 dark:via-blue-950/30 dark:to-indigo-950/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Engagement quotidien personnel
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Évolution de vos interactions sur les derniers jours</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <defs>
                            <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="commentsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="hsl(var(--muted-foreground))" />
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
                              fontSize: '14px'
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="rect"
                          />
                          <Line
                            type="monotone"
                            dataKey="likes_count"
                            stroke="#ec4899"
                            strokeWidth={3}
                            name="❤️ Likes reçus"
                            dot={{ fill: '#ec4899', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#ec4899', strokeWidth: 2, fill: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="comments_count"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            name="💬 Commentaires"
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="views_count"
                            stroke="#10b981"
                            strokeWidth={3}
                            name="👁️ Vues"
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* RÉPARTITION DE L'ENGAGEMENT */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 2 }}
              >
                <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/50 to-indigo-50 dark:from-slate-950/50 dark:via-purple-950/30 dark:to-indigo-950/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          Répartition de mes interactions
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Comment les gens réagissent à mes publications</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="h-80 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={engagementData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {engagementData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="hsl(var(--card))"
                                strokeWidth={4}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
                              fontSize: '14px'
                            }}
                            formatter={(value: number) => [`${value}`, 'Interactions']}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => <span className="font-semibold">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* STATS LÉGENDE PERSONNALISÉE */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      {engagementData.map((item, index) => (
                        <div key={index} className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800 dark:text-slate-200">{item.value}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {overview.total_likes + overview.total_comments + overview.total_views > 0
                              ? ((item.value / (overview.total_likes + overview.total_comments + overview.total_views)) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ONGLET TOP POSTS */}
            <TabsContent value="posts">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 via-amber-50/50 to-orange-50 dark:from-slate-950/50 dark:via-amber-950/30 dark:to-orange-950/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center gap-4">
                      <div className="relative">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                          <Crown className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <Star className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                          Mes publications les plus performantes
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Ce qui marche le mieux dans mon contenu</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    {topPosts.slice(0, 5).map((post, index) => (
                      <motion.div
                        key={post.post_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="group/post flex items-start gap-6 p-6 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-amber-100/50 dark:border-amber-800/30 hover:bg-white/90 dark:hover:bg-slate-800/60 transition-all duration-200 shadow-sm hover:shadow-lg"
                      >
                        {/* POSITION AVEC BADGE */}
                        <div className="flex-shrink-0 relative">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600' :
                            'bg-gradient-to-br from-slate-500 to-slate-600'
                          }`}>
                            {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                          )}
                        </div>

                        {/* CONTENU DU POST */}
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 dark:text-slate-200 font-semibold mb-3 line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>

                          {/* MÉTRIQUES */}
                          <div className="grid grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                  {formatNumber(post.likes_count || 0)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Likes</div>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {formatNumber(post.comments_count || 0)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Commentaires</div>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Eye className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatNumber(post.views_count || 0)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Vues</div>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Target className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                  {Math.round(post.engagement_score || 0)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                            </div>
                          </div>

                          {/* BADGE PERFORMANCE */}
                          <div className="mt-4 flex justify-end">
                            <Badge className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              post.engagement_score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                              post.engagement_score >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              post.engagement_score >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
                            }`}>
                              {post.engagement_score >= 80 ? '🚀 Performance exceptionnelle' :
                               post.engagement_score >= 60 ? '⭐ Très bonne performance' :
                               post.engagement_score >= 40 ? '📈 Bonne performance' :
                               '📊 Performance moyenne'}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ONGLET ACTIVITÉ */}
            <TabsContent value="activity">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/50 to-blue-50 dark:from-slate-950/50 dark:via-cyan-950/30 dark:to-blue-950/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-300 shadow-lg hover:shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="relative pb-6">
                    <CardTitle className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                          Mon rythme de publication optimal
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Quand poster pour maximiser l'engagement</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="h-80 w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyActivity} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <defs>
                            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="hsl(var(--muted-foreground))" />
                          <XAxis
                            dataKey="hour"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
                              fontSize: '14px'
                            }}
                            formatter={(value: number) => [`${value} publications`, 'Activité']}
                          />
                          <Bar
                            dataKey="posts"
                            fill="url(#activityGradient)"
                            radius={[8, 8, 0, 0]}
                            name="Publications"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* RECOMMANDATIONS PERSONNALISÉES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl border border-emerald-200/30 dark:border-emerald-800/30">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-200">Meilleures heures</h4>
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                          Publiez entre 19h-21h pour maximiser votre visibilité
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            Pic d'activité: 20h
                          </span>
                        </div>
                      </div>

                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/30 dark:border-blue-800/30">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-blue-800 dark:text-blue-200">Conseils IA</h4>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Vos publications du soir obtiennent 40% plus d'interactions
                        </p>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            Optimisé pour vous
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
