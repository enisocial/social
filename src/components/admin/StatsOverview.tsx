import { Card } from '@/components/ui/card';
import { Users, FileText, MessageSquare, Heart, Share2, Flag, Shield, Activity } from 'lucide-react';
import { PlatformStats } from '@/hooks/usePlatformStats';

interface StatsOverviewProps {
  stats: PlatformStats;
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: stats.totalUsers.toLocaleString(),
      subtitle: `+${stats.newUsersThisWeek} cette semaine`,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats.activeUsersToday.toLocaleString(),
      subtitle: 'Aujourd\'hui',
      icon: Activity,
      color: 'text-green-500'
    },
    {
      title: 'Posts Total',
      value: stats.totalPosts.toLocaleString(),
      subtitle: `${stats.postsToday} aujourd'hui`,
      icon: FileText,
      color: 'text-purple-500'
    },
    {
      title: 'Commentaires',
      value: stats.totalComments.toLocaleString(),
      subtitle: 'Total',
      icon: MessageSquare,
      color: 'text-orange-500'
    },
    {
      title: 'Likes',
      value: stats.totalLikes.toLocaleString(),
      subtitle: 'Total',
      icon: Heart,
      color: 'text-red-500'
    },
    {
      title: 'Partages',
      value: stats.totalShares.toLocaleString(),
      subtitle: 'Total',
      icon: Share2,
      color: 'text-cyan-500'
    },
    {
      title: 'Taux d\'Engagement',
      value: `${stats.engagementRate}%`,
      subtitle: 'Moyen par post',
      icon: Activity,
      color: 'text-emerald-500'
    },
    {
      title: 'File de Modération',
      value: stats.moderationQueueSize.toLocaleString(),
      subtitle: stats.reportsToday > 0 ? `${stats.reportsToday} nouveaux aujourd'hui` : 'En attente',
      icon: Flag,
      color: stats.moderationQueueSize > 0 ? 'text-yellow-500' : 'text-gray-500'
    },
    {
      title: 'Utilisateurs Bannis',
      value: stats.bannedUsers.toLocaleString(),
      subtitle: 'Total',
      icon: Shield,
      color: 'text-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
            <stat.icon className={`w-12 h-12 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};
