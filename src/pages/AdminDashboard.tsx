import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, FileText, MessageSquare, Flag, TrendingUp, Trash2, Shield, 
  Search, Image as ImageIcon, UserX, Activity, ScrollText
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profiles: {
    username: string;
    name: string;
  };
}

interface Report {
  id: string;
  reason: string;
  created_at: string;
  profiles: {
    username: string;
    name: string;
  };
  target_post_id: string | null;
  target_comment_id: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const { logs: auditLogs, loading: logsLoading, refetch: refetchLogs } = useAuditLogs();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string; id: string} | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('Accès refusé');
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchPosts(),
      fetchReports(),
      fetchStats()
    ]);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers(data || []);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        media_url,
        created_at,
        profiles (username, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    setPosts(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        profiles (username, name)
      `)
      .order('created_at', { ascending: false });

    setReports(data || []);
  };

  const fetchStats = async () => {
    const { data, error } = await supabase.rpc('get_platform_stats');
    
    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    if (data && data.length > 0) {
      setStats(data[0]);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'user') {
        // Log first
        await supabase.rpc('log_admin_action', {
          p_action: 'DELETE_USER',
          p_target_type: 'user',
          p_target_id: deleteTarget.id,
          p_details: {}
        });

        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast.success('Utilisateur supprimé');
      } else if (deleteTarget.type === 'post') {
        // Log first
        await supabase.rpc('log_admin_action', {
          p_action: 'DELETE_POST',
          p_target_type: 'post',
          p_target_id: deleteTarget.id,
          p_details: {}
        });

        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast.success('Post supprimé');
      }

      fetchAllData();
      refetchLogs();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_admin_action', {
        p_action: 'PROMOTE_TO_ADMIN',
        p_target_type: 'user',
        p_target_id: userId,
        p_details: {}
      });

      toast.success('Utilisateur promu administrateur');
      refetchLogs();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Erreur lors de la promotion');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tableau de bord Admin</h1>
          <p className="text-muted-foreground">Gérez votre plateforme Social</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs Total</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total_users}</p>
                  <p className="text-xs text-green-500 mt-1">
                    +{stats.new_users_this_week} cette semaine
                  </p>
                </div>
                <Users className="w-12 h-12 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Posts Total</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total_posts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tout le contenu</p>
                </div>
                <FileText className="w-12 h-12 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs Actifs</p>
                  <p className="text-3xl font-bold text-foreground">{stats.active_users_today}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aujourd'hui</p>
                </div>
                <Activity className="w-12 h-12 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stories Actives</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total_stories}</p>
                  <p className="text-xs text-muted-foreground mt-1">En cours</p>
                </div>
                <ImageIcon className="w-12 h-12 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages Total</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total_messages}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversations</p>
                </div>
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Signalements</p>
                  <p className="text-3xl font-bold text-foreground">{reports.length}</p>
                  <p className="text-xs text-red-500 mt-1">À traiter</p>
                </div>
                <Flag className="w-12 h-12 text-primary" />
              </div>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des utilisateurs ou des posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="posts">
              <FileText className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Flag className="w-4 h-4 mr-2" />
              Signalements
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="w-4 h-4 mr-2" />
              Logs d'audit
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Membre depuis {formatDistanceToNow(new Date(user.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePromoteToAdmin(user.id)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Promouvoir Admin
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget({ type: 'user', id: user.id });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-foreground">{post.profiles.name}</p>
                      <Badge variant="secondary">@{post.profiles.username}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                    <p className="text-foreground mb-2">{post.content}</p>
                    {post.media_url && (
                      <img 
                        src={post.media_url} 
                        alt="Post media" 
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteTarget({ type: 'post', id: post.id });
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Flag className="w-4 h-4 text-red-500" />
                      <p className="font-semibold text-foreground">
                        Signalé par @{report.profiles.username}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      <span className="font-medium">Raison:</span> {report.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cible: {report.target_post_id ? 'Post' : 'Commentaire'}
                    </p>
                  </div>
                  <Badge variant="destructive">Nouveau</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {logsLoading ? (
              <div className="text-center text-muted-foreground py-8">Chargement des logs...</div>
            ) : auditLogs.length === 0 ? (
              <Card className="p-8 text-center">
                <ScrollText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun log d'audit pour le moment</p>
              </Card>
            ) : (
              auditLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={log.admin?.avatar_url || ''} />
                        <AvatarFallback>{log.admin?.name?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{log.admin?.name || 'Admin'}</p>
                          <Badge variant={
                            log.action.includes('DELETE') ? 'destructive' : 
                            log.action.includes('PROMOTE') ? 'default' : 
                            'secondary'
                          }>
                            {log.action === 'DELETE_USER' && '🗑️ Suppression utilisateur'}
                            {log.action === 'DELETE_POST' && '🗑️ Suppression post'}
                            {log.action === 'DELETE_COMMENT' && '🗑️ Suppression commentaire'}
                            {log.action === 'PROMOTE_TO_ADMIN' && '⭐ Promotion admin'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{log.admin?.username || 'admin'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(log.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                        {log.target_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {log.target_type} • ID: {log.target_id.substring(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement{' '}
              {deleteTarget?.type === 'user' ? 'cet utilisateur' : 'ce post'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
