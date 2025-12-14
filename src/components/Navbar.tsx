import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BellRing,
  MessagesSquare,
  User,
  LogOut,
  Settings,
  BarChart3,
  Shield,
  Users,
  Menu,
  UserRoundPlus,
  Sparkles,
  Activity,
  Heart,
  Globe,
  Zap,
  Mic,
  Radio
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Éviter tout affichage temporaire si le profil n'est pas complètement chargé
  const isProfileLoaded = profile && profile.name && profile.username && typeof profile.name === 'string' && typeof profile.username === 'string';

  const { data: isAdmin } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return false;

      // TEMP FIX: Check admin by email instead of user_roles table (RLS issues)
      if (user.email === 'admin@binkaa.com') {
        return true;
      }

      // Check for admin role in database (fallback)
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        return !!data;
      } catch (error) {
        console.warn('Could not check user_roles table:', error);
        return false;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Use unread messages hook (simplified version)
  const { totalUnread: unreadMessagesCount = 0 } = useUnreadMessages();

  const getConversationUnreadCount = () => 0; // Placeholder
  const unreadCount = 0; // TODO: Implémenter notifications
  const pendingFriendRequests = 0; // TODO: Implémenter demandes d'amis

  // DEBUG: Log badge values
  console.log('🎯 Navbar Badges:', {
    messages: unreadMessagesCount,
    notifications: unreadCount,
    friends: pendingFriendRequests
  });

  if (!user) return null;

  // Hide navbar for admin users - they should only see admin panel
  if (isAdmin) return null;

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="relative">
            <img
              src="/icon-192.png"
              alt="Logo"
              className="w-9 h-9 rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
          </div>
          <span className="text-xl font-bold hidden sm:inline bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            <span className="text-amber-600">s</span>ocial
          </span>
        </Link>

        {/* Search Bar - Center */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <div className="flex-1 max-w-xl mx-4 hidden md:block cursor-pointer">
              <div className="w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-xl px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 shadow-sm">
                🔍 Rechercher sur social...
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0">
            <GlobalSearch />
          </DialogContent>
        </Dialog>

        {/* MENU DE NAVIGATION ULTRA-MODERNE AFRICAIN - Right */}
        <div className="hidden md:flex items-center gap-2">
          {/* ACCUEIL */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/feed" className="relative group">
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                ${isActivePath('/feed')
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25'
                  : 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10'
                }
              `}>
                <Home className={`w-6 h-6 transition-all duration-300 ${
                  isActivePath('/feed')
                    ? 'text-white scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-emerald-600 group-hover:scale-105'
                }`} />

                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </motion.div>

          {/* DÉCOUVRIR DES AMIS */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/find-friends" className="relative group">
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                ${isActivePath('/find-friends')
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25'
                  : 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10'
                }
              `}>
                <Sparkles className={`w-6 h-6 transition-all duration-300 ${
                  isActivePath('/find-friends')
                    ? 'text-white scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-teal-600 group-hover:scale-105'
                }`} />

                {/* BADGE AMIS EN ATTENTE ULTRA-MODERNE */}
                {pendingFriendRequests && pendingFriendRequests > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg flex items-center justify-center"
                  >
                    <span className="text-white font-bold text-xs">
                      {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                    </span>
                    {/* PULSE EFFECT */}
                    <div className="absolute inset-0 w-6 h-6 bg-amber-400 rounded-full animate-ping opacity-75"></div>
                  </motion.div>
                )}

                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-400/0 via-teal-400/20 to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </motion.div>

          {/* MESSAGES */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/messages" className="relative group">
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                ${isActivePath('/messages')
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25'
                  : 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10'
                }
              `}>
                <MessagesSquare className={`w-6 h-6 transition-all duration-300 ${
                  isActivePath('/messages')
                    ? 'text-white scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-cyan-600 group-hover:scale-105'
                }`} />

                {/* BADGE MESSAGES NON LUS ULTRA-MODERNE */}
                {unreadMessagesCount && unreadMessagesCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg flex items-center justify-center"
                  >
                    <span className="text-white font-bold text-xs">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                    {/* PULSE EFFECT */}
                    <div className="absolute inset-0 w-6 h-6 bg-red-400 rounded-full animate-ping opacity-75"></div>
                  </motion.div>
                )}

                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </motion.div>

          {/* POSTS VOCAUX */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/voice-posts" className="relative group">
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                ${isActivePath('/voice-posts')
                  ? 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25'
                  : 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10'
                }
              `}>
                <Mic className={`w-6 h-6 transition-all duration-300 ${
                  isActivePath('/voice-posts')
                    ? 'text-white scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-rose-600 group-hover:scale-105'
                }`} />

                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-400/0 via-rose-400/20 to-rose-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </motion.div>



          {/* NOTIFICATIONS */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/notifications" className="relative group">
              <div className={`
                relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
                ${isActivePath('/notifications')
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25'
                  : 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10'
                }
              `}>
                <BellRing className={`w-6 h-6 transition-all duration-300 ${
                  isActivePath('/notifications')
                    ? 'text-white scale-110'
                    : 'text-gray-600 dark:text-gray-300 group-hover:text-purple-600 group-hover:scale-105'
                }`} />

                {/* BADGE NOTIFICATIONS NON LUES ULTRA-MODERNE */}
                {unreadCount && unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg flex items-center justify-center"
                  >
                    <span className="text-white font-bold text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                    {/* PULSE EFFECT */}
                    <div className="absolute inset-0 w-6 h-6 bg-red-400 rounded-full animate-ping opacity-75"></div>
                  </motion.div>
                )}

                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </motion.div>

          {/* MENU PROFIL ULTRA-MODERNE */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative w-12 h-12 rounded-2xl p-0 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300 group"
                >
                  <Avatar className="w-full h-full border-2 border-emerald-200/50 dark:border-emerald-800/50 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-colors">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                      {isProfileLoaded ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* EFFET DE FOND ANIMÉ */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </DropdownMenuTrigger>

              {/* MENU DÉROULANT ULTRA-MODERNE */}
              <DropdownMenuContent
                align="end"
                className="w-64 bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl p-2"
              >
                {/* HEADER PROFIL */}
                <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-emerald-200/50">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {isProfileLoaded ? profile.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{isProfileLoaded ? profile.name : 'Chargement...'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{isProfileLoaded ? `@${profile.username}` : '@chargement'}</p>
                    </div>
                  </div>
                </div>

                {/* MENU ITEMS */}
                <div className="space-y-1">
                  <DropdownMenuItem asChild className="rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer">
                    <Link to={`/profile/${profile?.username}`} className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium">Mon profil</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer">
                    <Link to="/friends" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
                        <Heart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="font-medium">Mes amis</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/50 cursor-pointer">
                    <Link to="/analytics" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="font-medium">Tableau de bord</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer">
                    <Link to="/settings" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">Paramètres</span>
                    </Link>
                  </DropdownMenuItem>

                  {/* TEMPORAIRE - OUTIL DE DIAGNOSTIC BADGE VERT */}
                  {(() => {
                    console.log('🔧 RENDERING DIAGNOSTIC BUTTON');
                    return (
                      <DropdownMenuItem asChild className="rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/50 cursor-pointer">
                        <Link to="/presence-debug" className="flex items-center gap-3 w-full">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                            <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="font-medium">🔧 Diagnostic Présence</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })()}

                  {isAdmin && (
                    <DropdownMenuItem asChild className="rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer">
                      <Link to="/admin" className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium">Administration</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </div>

                <DropdownMenuSeparator className="my-2" />

                {/* DÉCONNEXION */}
                <DropdownMenuItem
                  onClick={() => {
                    console.log('🔴 LOGOUT BUTTON CLICKED - Desktop menu');
                    signOut();
                  }}
                  className="rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer text-red-600 dark:text-red-400"
                >
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Search */}
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <div className="flex-1 max-w-xs cursor-pointer">
                <div className="w-full h-9 bg-muted/50 border-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground">
                  Rechercher...
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0">
              <GlobalSearch />
            </DialogContent>
          </Dialog>

          <Link to="/notifications" className="relative">
            <Button variant="ghost" size="icon">
              <BellRing className="h-5 w-5" />
              {unreadCount && unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-6 mt-8">
                {/* Profile Section */}
                <Link
                  to={isProfileLoaded ? `/profile/${profile.username}` : '#'}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
                    <AvatarFallback>
                      {isProfileLoaded ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{isProfileLoaded ? profile.name : 'Chargement...'}</p>
                    <p className="text-sm text-muted-foreground">{isProfileLoaded ? `@${profile.username}` : '@chargement'}</p>
                  </div>
                </Link>

                <div className="space-y-2">
                  <Link
                    to="/feed"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Accueil</span>
                  </Link>

                  <Link
                    to="/find-friends"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserRoundPlus className="h-5 w-5" />
                    <span className="font-medium">Amis</span>
                    {pendingFriendRequests && pendingFriendRequests > 0 && (
                      <Badge className="ml-auto bg-destructive">
                        {pendingFriendRequests}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    to="/messages"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessagesSquare className="h-5 w-5" />
                    <span className="font-medium">Messages</span>
                    {unreadMessagesCount && unreadMessagesCount > 0 && (
                      <Badge className="ml-auto bg-destructive">
                        {unreadMessagesCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    to="/voice-posts"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Mic className="h-5 w-5" />
                    <span className="font-medium">Posts vocaux</span>
                  </Link>

                  <Link
                    to="/friends"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Mes amis</span>
                  </Link>

                  <Link
                    to="/analytics"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium">Tableau de bord</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Paramètres</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-5 w-5" />
                      <span className="font-medium">Administration</span>
                    </Link>
                  )}
                </div>

                <Button
                  variant="destructive"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    console.log('🔴 LOGOUT BUTTON CLICKED - Mobile menu');
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Déconnexion
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
