import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Shield,
  Bell,
  Lock,
  HelpCircle,
  Info,
  Download,
  Trash2,
  Users,
  Activity,
  BarChart3,
  Calendar,
  MapPin,
  Award,
  BookOpen,
  Heart,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MenuItem {
  label: string;
  path: string;
  icon: any;
  danger?: boolean;
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
}

interface MoreSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export const MoreSection = ({ userId, isOwnProfile }: MoreSectionProps) => {
  // RÉCUPÉRATION DES STATISTIQUES RÉELLES
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const [postsResult, friendsResult, groupsResult] = await Promise.all([
        // Nombre de posts
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Nombre d'amis (relations acceptées)
        supabase
          .from('friend_requests')
          .select('id', { count: 'exact', head: true })
          .or(`and(sender_id.eq.${userId},status.eq.accepted),and(receiver_id.eq.${userId},status.eq.accepted)`),

        // Nombre de groupes (membres de groupes)
        supabase
          .from('group_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ]);

      return {
        posts: postsResult.count || 0,
        friends: friendsResult.count || 0,
        groups: groupsResult.count || 0,
        events: 0 // Temporairement à 0 car table events n'existe pas
      };
    }
  });

  const sections: MenuSection[] = [
    {
      title: 'Paramètres & confidentialité',
      icon: Settings,
      items: [
        { label: 'Paramètres du compte', path: '/settings', icon: Settings },
        { label: 'Confidentialité', path: '/privacy-settings', icon: Lock },
        { label: 'Notifications', path: '/settings/notifications', icon: Bell },
        { label: 'Sécurité', path: '/settings', icon: Shield }
      ]
    },
    {
      title: 'Activités & statistiques',
      icon: Activity,
      items: [
        { label: 'Vos publications', path: `/profile/${userId}`, icon: Calendar },
        { label: 'Statistiques', path: '/analytics', icon: BarChart3 },
        { label: 'Amis & réseau', path: '/friends', icon: Users },
        { label: 'Photos & albums', path: '/albums', icon: MapPin }
      ]
    },
    {
      title: 'Fonctionnalités avancées',
      icon: Star,
      items: [
        { label: 'Créer un événement', path: '/events', icon: Calendar },
        { label: 'Gérer les groupes', path: '/groups', icon: Users },
        { label: 'Marketplace', path: '/marketplace', icon: Award },
        { label: 'Analytics', path: '/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Aide & support',
      icon: HelpCircle,
      items: [
        { label: 'Centre d\'aide', path: '/help', icon: HelpCircle },
        { label: 'Signaler un problème', path: '/help', icon: Shield },
        { label: 'Conditions d\'utilisation', path: '/terms', icon: BookOpen },
        { label: 'Politique de confidentialité', path: '/privacy', icon: Lock }
      ]
    }
  ];

  // Actions du compte supprimées car nécessitent des implémentations spécifiques
  // qui ne sont pas encore disponibles dans cette version

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Plus d'options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.posts || 0}</div>
              <div className="text-sm text-muted-foreground">Publications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.friends || 0}</div>
              <div className="text-sm text-muted-foreground">Amis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats?.groups || 0}</div>
              <div className="text-sm text-muted-foreground">Groupes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats?.events || 0}</div>
              <div className="text-sm text-muted-foreground">Événements</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections organisées */}
      {sections.map((section, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <section.icon className="h-5 w-5" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {section.items.map((item, itemIndex) => (
                <Link key={itemIndex} to={item.path}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-auto p-3 ${
                      item.danger ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${item.danger ? 'text-red-500' : ''}`} />
                    <span className="text-left">{item.label}</span>
                    {itemIndex === 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Nouveau
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Section d'informations supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informations utiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* CONSEILS DYNAMIQUES BASÉS SUR LES STATISTIQUES */}
            {(!stats?.posts || stats.posts === 0) && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Créez votre première publication</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Partagez vos pensées, photos ou expériences pour commencer à interagir avec la communauté.
                  </p>
                </div>
              </div>
            )}

            {(stats?.friends || 0) < 5 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Élargissez votre réseau</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Vous avez {stats?.friends || 0} ami{stats?.friends === 1 ? '' : 's'}. Connectez-vous avec plus de personnes pour enrichir votre feed.
                  </p>
                </div>
              </div>
            )}

            {stats?.posts && stats.posts > 10 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900">Excellente activité !</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Vous avez {stats.posts} publications. Continuez à partager du contenu de qualité !
                  </p>
                </div>
              </div>
            )}

            {/* CONSEIL GÉNÉRIQUE SI TOUT VA BIEN */}
            {stats?.posts && stats.posts > 0 && (stats?.friends || 0) >= 5 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Star className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900">Profil actif</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Votre profil est bien développé avec {stats.posts} publications et {stats.friends} amis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pied de page avec version */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Version 1.0.0 • Social Media Platform</p>
        <p className="mt-1">© 2024 Tous droits réservés</p>
      </div>
    </div>
  );
};
