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
  UserRoundPlus
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

  const { data: isAdmin } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Notifications unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: false
  });

  // Use centralized unread messages hook
  const { totalUnread: unreadMessagesCount } = useUnreadMessages();

  // Subscribe to realtime updates for notifications only
  // (messages are handled by useUnreadMessages hook)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`navbar-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: pendingFriendRequests } = useQuery({
    queryKey: ['pending-friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  if (!user) return null;

  // Hide navbar for admin users - they should only see admin panel
  if (isAdmin) return null;

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2 flex-shrink-0">
          <img 
            src="/icon-192.png" 
            alt="Logo" 
            className="w-8 h-8 rounded-lg"
          />
          <span className="text-xl font-bold hidden sm:inline">
            <span className="text-primary">s</span>ocial
          </span>
        </Link>

        {/* Search Bar - Center */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <div className="flex-1 max-w-xl mx-4 hidden md:block cursor-pointer">
              <div className="w-full bg-muted/50 border-0 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/70 transition-colors">
                Rechercher sur s-ocial...
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0">
            <GlobalSearch />
          </DialogContent>
        </Dialog>

        {/* Desktop Navigation - Right */}
        <div className="hidden md:flex items-center gap-1">
          {/* Home */}
          <Link to="/feed">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full ${isActivePath('/feed') ? 'bg-accent' : ''}`}
            >
              <Home className={`h-5 w-5 ${isActivePath('/feed') ? 'text-primary' : 'text-foreground'}`} />
            </Button>
          </Link>

          {/* Friends */}
          <Link to="/find-friends" className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full ${isActivePath('/find-friends') ? 'bg-accent' : ''}`}
            >
              <UserRoundPlus className={`h-5 w-5 ${isActivePath('/find-friends') ? 'text-primary' : 'text-foreground'}`} />
              {pendingFriendRequests && pendingFriendRequests > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                  {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Messages */}
          <Link to="/messages" className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full ${isActivePath('/messages') ? 'bg-accent' : ''}`}
            >
              <MessagesSquare className={`h-5 w-5 ${isActivePath('/messages') ? 'text-primary' : 'text-foreground'}`} />
              {unreadMessagesCount && unreadMessagesCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Notifications */}
          <Link to="/notifications" className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`rounded-full ${isActivePath('/notifications') ? 'bg-accent' : ''}`}
            >
              <BellRing className={`h-5 w-5 ${isActivePath('/notifications') ? 'text-primary' : 'text-foreground'}`} />
              {unreadCount && unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Avatar Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full ml-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
                  <AvatarFallback>
                    {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to={`/profile/${profile?.username}`} className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/friends" className="flex items-center cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Mes amis
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/analytics" className="flex items-center cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Tableau de bord
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Administration
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  to={`/profile/${profile?.username}`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
                    <AvatarFallback>
                      {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">@{profile?.username}</p>
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
