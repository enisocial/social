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
  ArrowLeft,
  Activity,
  TrendingUp,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Target,
  BarChart3,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/30 relative overflow-hidden">
      {/* FOND ANIMÉ ULTRA-MODERNE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 via-cyan-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400/10 via-pink-400/10 to-rose-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-emerald-400/5 to-green-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <AdminNavbar />
      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {/* HEADER ULTRA-MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* ICÔNE ANIMÉE DU HEADER */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 1, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent"
                >
                  Gestion des Utilisateurs
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2"
                >
                  <Settings className="w-5 h-5 text-emerald-500" />
                  Administration professionnelle des comptes utilisateur
                </motion.p>
              </div>
            </div>

            {/* BOUTON RETOUR ULTRA-MODERNE */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button
                variant="outline"
                onClick={() => navigate('/admin-dashboard')}
                className="bg-gradient-to-r from-white/80 via-blue-50/60 to-indigo-50/60 dark:from-slate-800/80 dark:via-slate-700/60 dark:to-slate-600/60 backdrop-blur-xl border-2 border-white/40 dark:border-slate-700/60 hover:border-blue-300/60 dark:hover:border-blue-600/60 shadow-xl hover:shadow-2xl transition-all duration-300 px-6 py-3 rounded-2xl"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="font-semibold">Retour Dashboard</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* BARRE DE RECHERCHE ET ACTIONS ULTRA-MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-white/95 via-blue-50/80 to-indigo-50/80 dark:from-slate-900/95 dark:via-blue-950/80 dark:to-indigo-950/80 backdrop-blur-xl border-2 border-white/40 dark:border-slate-700/60 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-5 w-5" />
                    <Input
                      placeholder="Rechercher par nom, username ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-white/70 dark:bg-slate-800/70 border-2 border-slate-200/60 dark:border-slate-600/60 rounded-2xl focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    <span className="font-semibold">Actualiser</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CARTES DE STATISTIQUES ULTRA-MODERNES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Users */}
          <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all duration-300">
                  <Users className="h-8 w-8" />
                </div>
                <TrendingUp className="h-5 w-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-blue-100 text-sm font-medium">Total Utilisateurs</p>
                <p className="text-3xl font-black">{users.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Admins */}
          <Card className="bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white shadow-2xl hover:shadow-red-500/25 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all duration-300">
                  <Crown className="h-8 w-8" />
                </div>
                <Sparkles className="h-5 w-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-red-100 text-sm font-medium">Administrateurs</p>
                <p className="text-3xl font-black">{users.filter(u => u.is_admin).length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Moderators */}
          <Card className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 text-white shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all duration-300">
                  <Shield className="h-8 w-8" />
                </div>
                <Target className="h-5 w-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-purple-100 text-sm font-medium">Modérateurs</p>
                <p className="text-3xl font-black">{users.filter(u => u.is_moderator).length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all duration-300">
                  <UserCheck className="h-8 w-8" />
                </div>
                <CheckCircle className="h-5 w-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-emerald-100 text-sm font-medium">Utilisateurs Actifs</p>
                <p className="text-3xl font-black">{users.filter(u => !u.is_admin && !u.is_moderator && !u.is_banned).length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* LISTE DES UTILISATEURS ULTRA-MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <Card className="bg-gradient-to-br from-white/95 via-slate-50/80 to-blue-50/60 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-700/80 backdrop-blur-xl border-2 border-white/40 dark:border-slate-700/60 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/60 dark:from-slate-800/80 dark:to-slate-700/60 border-b border-slate-200/60 dark:border-slate-700/60 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                      Liste des Utilisateurs
                    </CardTitle>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                      <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-3xl blur-lg"></div>
                  </div>
                  <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">Chargement des utilisateurs...</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  {paginatedUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 transition-all duration-300 p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          {/* AVATAR ANIMÉ */}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                            className="relative"
                          >
                            <Avatar className="h-16 w-16 ring-4 ring-white/60 dark:ring-slate-700/60 hover:ring-blue-300/60 dark:hover:ring-blue-600/60 transition-all duration-300 shadow-lg">
                              <AvatarImage src={user.avatar_url || ''} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xl">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white dark:border-slate-800 flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>

                          {/* INFOS UTILISATEUR */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                {user.name}
                              </h3>
                              {getUserRoleBadge(user)}
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-600 dark:text-slate-400 font-medium">
                                @{user.username}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-all duration-200"
                              >
                                <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-2 w-56">
                              {!user.is_admin && (
                                <DropdownMenuItem
                                  onClick={() => handleUserAction('promote_admin')}
                                  className="rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-950/30 dark:hover:to-pink-950/30 cursor-pointer px-4 py-3"
                                >
                                  <Crown className="w-4 h-4 mr-3 text-red-500" />
                                  <span className="font-medium text-red-700 dark:text-red-300">Promouvoir Admin</span>
                                </DropdownMenuItem>
                              )}
                              {!user.is_moderator && !user.is_admin && (
                                <DropdownMenuItem
                                  onClick={() => handleUserAction('promote_moderator')}
                                  className="rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 cursor-pointer px-4 py-3"
                                >
                                  <Shield className="w-4 h-4 mr-3 text-blue-500" />
                                  <span className="font-medium text-blue-700 dark:text-blue-300">Promouvoir Modérateur</span>
                                </DropdownMenuItem>
                              )}
                              {(user.is_admin || user.is_moderator) && (
                                <DropdownMenuItem
                                  onClick={() => handleUserAction('demote')}
                                  className="rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50 dark:hover:from-slate-950/30 dark:hover:to-gray-950/30 cursor-pointer px-4 py-3"
                                >
                                  <User className="w-4 h-4 mr-3 text-slate-500" />
                                  <span className="font-medium text-slate-700 dark:text-slate-300">Rétrograder</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleUserAction('ban')}
                                className="rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-950/30 dark:hover:to-red-950/50 cursor-pointer px-4 py-3"
                              >
                                <Ban className="w-4 h-4 mr-3 text-red-500" />
                                <span className="font-medium text-red-700 dark:text-red-300">Bannir Utilisateur</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Users className="w-12 h-12 text-slate-500 dark:text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Aucun utilisateur trouvé
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        Aucun utilisateur ne correspond à votre recherche.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PAGINATION ULTRA-MODERNE */}
              {totalPages > 1 && (
                <div className="bg-gradient-to-r from-slate-50/80 to-blue-50/60 dark:from-slate-800/80 dark:to-slate-700/60 border-t border-slate-200/60 dark:border-slate-700/60 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white/70 dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-700/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 rounded-xl px-4 py-2"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Précédent
                      </Button>

                      {/* NUMÉROS DE PAGE ULTRA-MODERNES */}
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          const pageNumber = Math.max(1, Math.min(totalPages - 6, currentPage - 3)) + i;
                          if (pageNumber > totalPages) return null;

                          return (
                            <motion.div
                              key={pageNumber}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant={currentPage === pageNumber ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                                  currentPage === pageNumber
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-700/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
                                }`}
                              >
                                {pageNumber}
                              </Button>
                            </motion.div>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-white/70 dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-700/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 rounded-xl px-4 py-2"
                      >
                        Suivant
                        <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
