import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Search,
  Shield,
  Ban,
  Trash2,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Crown,
  User,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  is_moderator: boolean;
  is_banned: boolean;
  email?: string; // Optional since it comes from auth, not profiles table
}

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Optimized query: Get profiles with their roles in a single query
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          username,
          avatar_url,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Limit for performance

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get roles for these users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.warn('Could not fetch roles:', rolesError);
      }

      // Combine profiles with roles efficiently
      const roleMap = new Map();
      roles?.forEach(role => {
        if (!roleMap.has(role.user_id)) {
          roleMap.set(role.user_id, []);
        }
        roleMap.get(role.user_id).push(role.role);
      });

      const usersWithRoles = profiles.map(profile => {
        const userRoles = roleMap.get(profile.id) || [];
        return {
          ...profile,
          is_admin: userRoles.includes('admin'),
          is_moderator: userRoles.includes('moderator'),
          is_banned: false // TODO: Implement ban system
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: 'promote_admin' | 'promote_moderator' | 'demote' | 'ban' | 'unban') => {
    if (!selectedUser) return;

    try {
      switch (action) {
        case 'promote_admin':
          const { error: adminError } = await supabase
            .from('user_roles')
            .insert({ user_id: selectedUser.id, role: 'admin' });
          if (adminError) throw adminError;
          toast.success('Utilisateur promu administrateur');
          break;

        case 'promote_moderator':
          const { error: modError } = await supabase
            .from('user_roles')
            .insert({ user_id: selectedUser.id, role: 'moderator' });
          if (modError) throw modError;
          toast.success('Utilisateur promu modérateur');
          break;

        case 'demote':
          const { error: demoteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', selectedUser.id);
          if (demoteError) throw demoteError;
          toast.success('Utilisateur rétrogradé');
          break;

        case 'ban':
          // TODO: Implement ban system
          toast.info('Fonctionnalité de bannissement à implémenter');
          break;

        case 'unban':
          // TODO: Implement unban system
          toast.info('Fonctionnalité de débannissement à implémenter');
          break;
      }

      await fetchUsers(); // Refresh the list
      setActionDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'action');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getUserRoleBadge = (user: UserProfile) => {
    if (user.is_admin) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
    } else if (user.is_moderator) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Shield className="w-3 h-3 mr-1" />Modérateur</Badge>;
    } else if (user.is_banned) {
      return <Badge variant="destructive" className="bg-gray-100 text-gray-800"><Ban className="w-3 h-3 mr-1" />Banni</Badge>;
    } else {
      return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Utilisateur</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Gestion des Utilisateurs
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Gérez les comptes utilisateurs, rôles et permissions
                </p>
              </div>
            </div>

            {/* Bouton Retour */}
            <Button
              variant="outline"
              onClick={() => navigate('/admin-dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au Dashboard
            </Button>
          </div>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchUsers} disabled={loading} variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Administrateurs</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.is_admin).length}</p>
                </div>
                <Crown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Modérateurs</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.is_moderator).length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold">{users.filter(u => !u.is_admin && !u.is_moderator).length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || ''} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          {getUserRoleBadge(user)}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialogOpen(true);
                        }}
                      >
                        Actions
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actions pour {selectedUser?.name}</DialogTitle>
              <DialogDescription>
                Choisissez l'action à effectuer sur cet utilisateur.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2">
              {!selectedUser?.is_admin && (
                <Button
                  onClick={() => handleUserAction('promote_admin')}
                  className="justify-start"
                  variant="outline"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Promouvoir administrateur
                </Button>
              )}
              {!selectedUser?.is_moderator && !selectedUser?.is_admin && (
                <Button
                  onClick={() => handleUserAction('promote_moderator')}
                  className="justify-start"
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Promouvoir modérateur
                </Button>
              )}
              {(selectedUser?.is_admin || selectedUser?.is_moderator) && (
                <Button
                  onClick={() => handleUserAction('demote')}
                  className="justify-start"
                  variant="outline"
                >
                  <User className="w-4 h-4 mr-2" />
                  Rétrograder
                </Button>
              )}
              <Button
                onClick={() => handleUserAction('ban')}
                className="justify-start text-red-600 hover:text-red-700"
                variant="outline"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bannir
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Annuler
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
