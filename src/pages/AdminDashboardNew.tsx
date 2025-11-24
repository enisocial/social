import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useRole } from '@/hooks/useRole';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, FileText, Flag, ScrollText, Shield, BarChart3, Settings, RefreshCw, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { StatsOverview } from '@/components/admin/StatsOverview';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { ModerationQueue } from '@/components/admin/ModerationQueue';
import { UserManagement } from '@/components/admin/UserManagement';
import { BroadcastMessageForm } from '@/components/admin/BroadcastMessageForm';
import { BroadcastMessagesList } from '@/components/admin/BroadcastMessagesList';
import { PlatformSettings } from '@/components/admin/PlatformSettings';

interface User {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  status?: string;
  ban_reason?: string | null;
  ban_until?: string | null;
}

export default function AdminDashboardNew() {
  const navigate = useNavigate();
  const { isAdmin, promoteToAdmin, deleteUser } = useAdmin();
  const { role, loading: roleLoading, promoteToModerator } = useRole();
  const { stats, chartData, loading: statsLoading, refetch: refetchStats } = usePlatformStats();
  const { logs: auditLogs, loading: logsLoading } = useAuditLogs();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Accès refusé');
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), refetchStats()]);
    toast.success('Données actualisées');
    setRefreshing(false);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    await promoteToAdmin(userId);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      await deleteUser(userId);
      fetchUsers();
    }
  };

  if (roleLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Chargement...</div>
        </main>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Centre d'Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion complète de la plateforme sociale
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="mb-8">
            <StatsOverview stats={stats} />
          </div>
        )}

        {/* Analytics Charts */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <AnalyticsCharts data={chartData} />
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="moderation" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-1'}`}>
            <TabsTrigger value="moderation">
              <Flag className="w-4 h-4 mr-2" />
              Modération
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="broadcast">
                  <Send className="w-4 h-4 mr-2" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="audit">
                  <ScrollText className="w-4 h-4 mr-2" />
                  Logs d'audit
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">File de modération</h2>
              <ModerationQueue />
            </div>
          </TabsContent>

          {/* Users Tab */}
          {isAdmin && (
            <TabsContent value="users">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Gestion des utilisateurs</h2>
                <UserManagement
                  users={users}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onPromoteToModerator={async (userId) => {
                    await promoteToModerator(userId);
                    fetchUsers();
                  }}
                  onDelete={handleDeleteUser}
                  onRefresh={fetchUsers}
                />
              </div>
            </TabsContent>
          )}

          {/* Broadcast Messages Tab */}
          {isAdmin && (
            <TabsContent value="broadcast">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Messages broadcast</h2>
                <div className="grid gap-6">
                  <BroadcastMessageForm />
                  <BroadcastMessagesList />
                </div>
              </div>
            </TabsContent>
          )}

          {/* Audit Logs Tab */}
          {isAdmin && (
            <TabsContent value="audit">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Historique des actions</h2>
                {/* Reuse audit logs component from original dashboard */}
              </div>
            </TabsContent>
          )}

          {/* Settings Tab */}
          {isAdmin && (
            <TabsContent value="settings">
              <PlatformSettings />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
