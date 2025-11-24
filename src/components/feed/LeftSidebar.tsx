import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, MessageCircle, Users, ShoppingBag, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const LeftSidebar = () => {
  const { user } = useAuth();

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
    enabled: !!user
  });

  const menuItems = [
    { icon: Home, label: 'Accueil', path: '/feed', color: 'text-primary' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', color: 'text-blue-500' },
    { icon: Users, label: 'Amis', path: '/friends', color: 'text-green-500' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', color: 'text-orange-500' },
    { icon: TrendingUp, label: 'Explore', path: '/explore', color: 'text-purple-500' },
    { icon: Calendar, label: 'Événements', path: '/groups', color: 'text-red-500' },
  ];

  return (
    <aside className="hidden lg:block w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide p-4">
      <nav className="space-y-1">
        <Link
          to={`/profile/${profile?.username}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {profile?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{profile?.name}</span>
        </Link>

        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted group-hover:bg-background">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t">
        <h3 className="px-2 text-xs font-semibold text-muted-foreground mb-2">RACCOURCIS</h3>
        <div className="space-y-1">
          <Link
            to="/groups"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-sm">Mes groupes</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
