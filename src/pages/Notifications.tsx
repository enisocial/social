import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/NotificationItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCheck,
  RefreshCw,
  Bell,
  Sparkles,
  Activity,
  Eye,
  EyeOff,
  ArrowLeft,
  TrendingUp,
  Users,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/10 dark:to-indigo-950/20">
      <Navbar />

      {/* HEADER ULTRA-MODERNE PROFESSIONNEL */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        {/* Background avec motifs subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/8 to-pink-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="text-center space-y-8">
            {/* Icône principale avec effet 3D */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
                  <Bell className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                {/* Anneau de lumière */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400 to-purple-400 blur-lg opacity-50 animate-pulse"></div>
                {/* Particules flottantes */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full"
                />
              </div>
            </motion.div>

            {/* Titre principal avec effet de texte sophistiqué */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-7xl font-black bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent leading-tight">
                Centre de
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Notifications
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
                🔔 Système de notifications intelligent pour rester connecté à votre communauté
              </p>
            </motion.div>

            {/* Métriques professionnelles en temps réel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{notifications.length}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className={`group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300 ${unreadCount > 0 ? 'ring-2 ring-red-400/50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${unreadCount > 0 ? 'bg-gradient-to-br from-red-500 to-pink-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'}`}>
                    {unreadCount > 0 ? (
                      <AlertCircle className="w-6 h-6 text-white" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{unreadCount}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Non lues</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{notifications.filter(n => n.read).length}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Lues</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/50 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {notifications.length > 0 ? Math.round((notifications.filter(n => !n.read).length / notifications.length) * 100) : 0}%
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Activité</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        {/* BARRE D'ACTIONS PROFESSIONNELLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 gap-3 px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-3 px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-300"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={() => markAllAsRead()}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white gap-3 px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CheckCheck className="w-5 h-5" />
                  Tout marquer comme lu
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ONGLETS ULTRA-MODERNES AVEC DESIGN PROFESSIONNEL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mb-12"
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')} className="w-full">
            <div className="flex justify-center">
              <TabsList className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-2 shadow-2xl">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 font-semibold"
                >
                  <Activity className="w-5 h-5" />
                  <span>Toutes les notifications</span>
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold px-3 py-1 rounded-full ml-2">
                    {notifications.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="unread"
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 font-semibold"
                >
                  <EyeOff className="w-5 h-5" />
                  <span>Non lues</span>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full ml-2 animate-pulse"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </motion.div>

        {/* CONTENU PRINCIPAL ULTRA-MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="max-w-5xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              // SKELETON LOADER PROFESSIONNEL
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Chargement des notifications...</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-2xl animate-pulse"></div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-5 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded w-1/2 animate-pulse"></div>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded-full animate-pulse"></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : filteredNotifications.length === 0 ? (
              // ÉTAT VIDE PROFESSIONNEL
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20 px-8"
              >
                <div className="relative mb-10">
                  {/* Icône principale avec effet de lumière */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
                    className="relative mx-auto w-32 h-32"
                  >
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center shadow-2xl border border-white/50 dark:border-slate-700/50">
                      {activeTab === 'unread' ? (
                        <Eye className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Bell className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    {/* Anneau de lumière animé */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl blur-xl"
                    />
                  </motion.div>

                  {/* Particules décoratives */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -20, 0],
                          opacity: [0, 0.6, 0],
                        }}
                        transition={{
                          duration: 3,
                          delay: i * 0.4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute w-2 h-2 bg-blue-400/40 rounded-full blur-sm"
                        style={{
                          left: `${20 + i * 10}%`,
                          top: '20%'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-3">
                      {activeTab === 'unread' ? '📭 Boîte de réception vide' : '🔔 Aucune notification'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                      {activeTab === 'unread'
                        ? 'Excellente nouvelle ! Vous êtes parfaitement à jour avec toutes vos notifications.'
                        : 'Vos notifications de la communauté apparaîtront ici dès qu\'il y aura de l\'activité.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {activeTab === 'unread' && notifications.length > 0 && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => setActiveTab('all')}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Activity className="w-5 h-5 mr-2" />
                          Voir toutes les notifications
                        </Button>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleRefresh}
                        variant="outline"
                        disabled={isRefreshing}
                        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Actualiser
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              // LISTE DES NOTIFICATIONS PROFESSIONNELLE
              <motion.div
                key="notifications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* En-tête de la liste avec compteur */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {activeTab === 'unread' ? 'Notifications non lues' : 'Toutes les notifications'}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Indicateur de statut temps réel */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-2 rounded-full text-sm font-medium"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Temps réel
                  </motion.div>
                </div>

                {/* Liste des notifications avec animations sophistiquées */}
                <div className="space-y-3">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        ease: "easeOut"
                      }}
                      whileHover={{
                        scale: 1.02,
                        y: -2,
                        transition: { duration: 0.2 }
                      }}
                      className="group bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden transition-all duration-300"
                    >
                      {/* Indicateur de notification non lue */}
                      {!notification.read && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: 4 }}
                          className="bg-gradient-to-b from-blue-500 to-indigo-500 h-full absolute left-0 top-0"
                        />
                      )}

                      <div className="p-6">
                        <NotificationItem
                          notification={notification}
                          onRead={markAsRead}
                        />
                      </div>

                      {/* Effet de survol subtil */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </motion.div>
                  ))}
                </div>

                {/* CHARGEMENT INFINI PROFESSIONNEL */}
                {hasNextPage && (
                  <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center py-16"
                  >
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl px-8 py-4 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex gap-2">
                          <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-3 h-3 bg-blue-500 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="w-3 h-3 bg-indigo-500 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            className="w-3 h-3 bg-purple-500 rounded-full"
                          />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Chargement de plus de notifications...</span>
                      </div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => fetchNextPage()}
                          variant="outline"
                          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Charger plus de notifications
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
