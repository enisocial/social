import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useRole } from '@/hooks/useRole';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useEffect, useState } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle,
  Users,
  Flag,
  Server,
  TrendingUp,
  Database,
  HardDrive,
  Zap,
  Activity,
  Settings,
  BarChart3,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboardNew() {
  const navigate = useNavigate();
  const { promoteToAdmin, deleteUser } = useAdmin();
  const { role, loading: roleLoading, promoteToModerator, isAdmin } = useRole();
  const { stats, loading: statsLoading, refreshStats } = useAdminStats();

  console.log('AdminDashboardNew rendered:', {
    isAdmin,
    role,
    roleLoading,
    pathname: window.location.pathname
  });

  // SYSTEM ADMIN CHECK: admin@binkaa.com is always admin
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } finally {
        setUserLoading(false);
      }
    };
    getCurrentUser();
  }, []);

  const isSystemAdmin = currentUser?.email === 'admin@binkaa.com';
  const hasAccess = isAdmin || isSystemAdmin;

  console.log('AdminDashboardNew access check:', {
    isAdmin,
    isSystemAdmin,
    currentUserEmail: currentUser?.email,
    roleLoading,
    userLoading,
    hasAccess
  });

  useEffect(() => {
    if (!roleLoading && !userLoading && !hasAccess) {
      console.log('AdminDashboardNew: Access denied, redirecting to /');
      toast.error('Accès refusé');
      navigate('/');
    }
  }, [roleLoading, userLoading, hasAccess, navigate]);

  if (roleLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-medium">Chargement du tableau de bord...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Centre d'Administration
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Gestion complète et sécurisée de votre plateforme sociale
              </p>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                  Accès administrateur confirmé
                </h2>
                <p className="text-green-700 dark:text-green-300 leading-relaxed">
                  Bienvenue dans votre tableau de bord d'administration. Vous disposez de tous les outils nécessaires
                  pour gérer efficacement votre plateforme sociale.
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <UserCheck className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-blue-500 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Gestion Utilisateurs</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Gérer les comptes et rôles</p>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate('/admin/users')}
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-orange-500 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <Flag className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Modération</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Contenus et signalements</p>
                </div>
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => navigate('/admin/moderation')}
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-purple-500 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <Server className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Système</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Configuration et maintenance</p>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => navigate('/admin/system')}
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-green-500 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Analytics</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Statistiques et métriques</p>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => navigate('/admin/analytics')}
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-red-500 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <HelpCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Centre d'Aide</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Messages de support</p>
                </div>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => navigate('/admin/help')}
                >
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`border-0 shadow-lg ${stats.systemStatus.database
            ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30'
            : 'bg-gradient-to-br from-red-50 to-red-50 dark:from-red-950/30 dark:to-red-950/30'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-lg ${stats.systemStatus.database ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${stats.systemStatus.database
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-red-800 dark:text-red-200'
                  }`}>Base de données</h3>
                  <p className={`text-sm ${stats.systemStatus.database
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-red-700 dark:text-red-300'
                  }`}>
                    {stats.systemStatus.database ? 'Opérationnelle' : 'Erreur'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${stats.systemStatus.database ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className={`text-xs ${stats.systemStatus.database
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stats.systemStatus.database ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg ${stats.systemStatus.storage
            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30'
            : 'bg-gradient-to-br from-red-50 to-red-50 dark:from-red-950/30 dark:to-red-950/30'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-lg ${stats.systemStatus.storage ? 'bg-blue-500' : 'bg-red-500'}`}>
                  <HardDrive className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${stats.systemStatus.storage
                    ? 'text-blue-800 dark:text-blue-200'
                    : 'text-red-800 dark:text-red-200'
                  }`}>Stockage</h3>
                  <p className={`text-sm ${stats.systemStatus.storage
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                  }`}>
                    {stats.systemStatus.storage ? 'Disponible' : 'Indisponible'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${stats.systemStatus.storage ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    <span className={`text-xs ${stats.systemStatus.storage
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stats.systemStatus.storage ? 'Optimal' : 'Erreur'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg ${stats.systemStatus.api
            ? 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30'
            : 'bg-gradient-to-br from-red-50 to-red-50 dark:from-red-950/30 dark:to-red-950/30'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-lg ${stats.systemStatus.api ? 'bg-violet-500' : 'bg-red-500'}`}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${stats.systemStatus.api
                    ? 'text-violet-800 dark:text-violet-200'
                    : 'text-red-800 dark:text-red-200'
                  }`}>API</h3>
                  <p className={`text-sm ${stats.systemStatus.api
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-red-700 dark:text-red-300'
                  }`}>
                    {stats.systemStatus.api ? 'Fonctionnelle' : 'Erreur'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${stats.systemStatus.api ? 'bg-violet-500' : 'bg-red-500'}`}></div>
                    <span className={`text-xs ${stats.systemStatus.api
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stats.systemStatus.api ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsLoading ? '...' : stats.activeUsers.toLocaleString()}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Posts aujourd'hui</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsLoading ? '...' : stats.postsToday.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Signalements</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsLoading ? '...' : stats.reportsCount.toLocaleString()}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total utilisateurs</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {statsLoading ? '...' : stats.totalUsers.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={refreshStats}
            disabled={statsLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Actualiser les statistiques
          </Button>
        </div>
      </main>
    </div>
  );
}
