import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/NotificationItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCheck,
  Loader2,
  RefreshCw,
  Bell,
  Sparkles,
  Activity,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Zap,
  ArrowLeft,
  Heart,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const { ref, inView } = useInView();

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  // Statistiques des notifications
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    read: notifications.length - unreadCount
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* HEADER ULTRA-MODERNE AFRICAIN */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        {/* Fond avec motifs africains subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-teal-500/5 to-cyan-500/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            {/* ICÔNE PRINCIPALE */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Bell className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* TITRE PRINCIPAL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🔔 Restez informé des activités de votre communauté panafricaine
              </p>
            </motion.div>

            {/* STATISTIQUES RAPIDES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 mt-8"
            >
              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-200/50">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {stats.total} notification{stats.total !== 1 ? 's' : ''} totale{stats.total !== 1 ? 's' : ''}
                </span>
              </div>

              {stats.unread > 0 && (
                <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-red-200/50">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {stats.unread} non lue{stats.unread !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-cyan-200/50">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {stats.read} lue{stats.read !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* BARRE D'ACTIONS MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap gap-4 mb-8 justify-center"
        >
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2 border-emerald-200/50 hover:bg-emerald-50 dark:border-emerald-800/50 dark:hover:bg-emerald-950/50 rounded-full px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 border-teal-200/50 hover:bg-teal-50 dark:border-teal-800/50 dark:hover:bg-teal-950/50 rounded-full px-6 py-3"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsRead()}
              className="gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl rounded-full px-6 py-3"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </Button>
          )}
        </motion.div>

        {/* ONGLETS ULTRA-MODERNES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8"
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')} className="w-full">
            <div className="flex justify-center">
              <TabsList className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2 shadow-xl">
                <TabsTrigger
                  value="all"
                  className="gap-3 rounded-xl px-8 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    <span className="font-semibold">Toutes</span>
                  </div>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-full">
                    {notifications.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="unread"
                  className="gap-3 rounded-xl px-8 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-5 h-5" />
                    <span className="font-semibold">Non lues</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </motion.div>

        {/* CONTENU PRINCIPAL */}
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            // SKELETON LOADER ULTRA-MODERNE
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2 animate-pulse"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/4 animate-pulse"></div>
                    </div>
                    <div className="w-6 h-6 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded animate-pulse"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            // ÉTAT VIDE ULTRA-MODERNE AFRICAIN
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-8"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                  {activeTab === 'unread' ? (
                    <Eye className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Bell className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                {/* Motifs décoratifs africains */}
                <div className="absolute -top-3 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-2 -left-3 w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>

              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                {activeTab === 'unread' ? '✨ Aucune notification non lue' : '🔔 Aucune notification'}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                {activeTab === 'unread'
                  ? 'Parfait ! Vous êtes à jour avec toutes vos notifications.'
                  : 'Les notifications de votre communauté apparaîtront ici au fur et à mesure.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {activeTab === 'unread' && stats.total > 0 && (
                  <Button
                    onClick={() => setActiveTab('all')}
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl px-8 py-3 text-lg rounded-full"
                  >
                    <Activity className="w-5 h-5 mr-2" />
                    Voir toutes les notifications
                  </Button>
                )}

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={isRefreshing}
                  className="px-8 py-3 text-lg border-2 border-gray-300 hover:border-emerald-300 rounded-full"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </motion.div>
          ) : (
            // LISTE DES NOTIFICATIONS ULTRA-MODERNE
            <div className="space-y-4">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="group"
                >
                  <NotificationItem
                    notification={notification}
                    onRead={markAsRead}
                  />
                </motion.div>
              ))}

              {/* CHARGEMENT INFINI ULTRA-MODERNE */}
              {hasNextPage && (
                <div ref={ref} className="flex justify-center py-12">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Chargement de notifications...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      className="border-2 border-emerald-200 hover:border-emerald-300 rounded-full px-8 py-3"
                    >
                      Charger plus de notifications
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
