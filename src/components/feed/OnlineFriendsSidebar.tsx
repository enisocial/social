import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMessenger } from '@/contexts/MessengerContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePresence } from '@/hooks/usePresence';
import { motion } from 'framer-motion';
import {
  Users,
  Wifi,
  WifiOff,
  MessageCircle,
  Activity,
  Globe,
  Sparkles
} from 'lucide-react';

export const OnlineFriendsSidebar = () => {
  const { openBubble } = useMessenger();
  const { isUserOnline, getLastSeen, presenceState } = usePresence();

  // Récupérer les amis de base
  const { data: rawFriends, isLoading } = useQuery({
    queryKey: ['online-friends-sidebar'],
    queryFn: async () => {
      // Récupérer les amis de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: friends } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(12);

      return friends?.map((req: any) => {
        const friend = req.sender_id === user.id ? req.receiver : req.sender;
        return {
          ...friend,
          conversationId: null,
          unreadCount: 0
        };
      }).sort((a, b) => a.name.localeCompare(b.name)) || [];
    },
    staleTime: 30000, // 30 secondes
  });

  // Combiner les amis avec les données de présence
  const friends = useMemo(() => {
    return rawFriends?.map(friend => ({
      ...friend,
      isOnline: isUserOnline(friend.id),
      lastSeen: getLastSeen(friend.id)
    }));
  }, [rawFriends, presenceState]);

  // Cache des conversations pour ouverture rapide
  const [conversationCache, setConversationCache] = useState<{ [friendId: string]: string | null }>({});

  // DEBUG: Forcer refresh du composant pour synchronisation
  const [, forceUpdate] = useState({});
  const triggerUpdate = () => forceUpdate({});

  const handleFriendClick = (friend: any) => {
    console.log('👆 [SIDEBAR] Clic sur ami détecté:', friend.name, 'ID:', friend.id);
    // Ouvrir la chatbubble directement
    openBubble(null, friend);
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return '';
    try {
      return formatDistanceToNow(new Date(lastSeen), {
        addSuffix: true,
        locale: fr
      });
    } catch {
      return '';
    }
  };

  const onlineCount = friends?.filter(friend => friend.isOnline).length || 0;
  const totalFriends = friends?.length || 0;

  if (isLoading) {
    // SKELETON LOADER ULTRA-MODERNE
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 p-6"
      >
        {/* HEADER SKELETON */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded-xl animate-pulse"></div>
            <div className="h-5 bg-gradient-to-r from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded w-24 animate-pulse"></div>
          </div>
          <div className="w-6 h-6 bg-gradient-to-r from-teal-200 to-cyan-200 dark:from-teal-800 dark:to-cyan-800 rounded animate-pulse"></div>
        </div>

        {/* FRIENDS SKELETON */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 animate-pulse"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded w-20"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-16"></div>
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-full"></div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden"
    >
      {/* HEADER ULTRA-MODERNE AFRICAIN */}
      <div className="relative p-6 border-b border-emerald-200/30 dark:border-emerald-800/30">
        {/* Fond avec motif subtil */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                Communauté active
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {onlineCount} en ligne • {totalFriends} amis
              </p>
            </div>
          </div>

          {/* BADGE COMPTEUR ANIMÉ */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              onlineCount > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg'
                : 'bg-gradient-to-r from-gray-400 to-gray-500'
            }`}>
              <span className="text-white font-bold text-sm">{onlineCount}</span>
            </div>
            {onlineCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white dark:border-gray-800"></div>
            )}
          </motion.div>
        </div>
      </div>

      {/* CONTENU AMIS */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {friends && friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((friend, index) => (
              <motion.button
                key={friend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => handleFriendClick(friend)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full group relative overflow-hidden"
              >
                {/* EFFET DE FOND ANIMÉ */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>

                <div className="relative flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200">
                  {/* AVATAR AVEC INDICATEUR DE STATUT ULTRA-MODERNE */}
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-emerald-200/50 dark:border-emerald-800/50 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-colors">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {friend.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* INDICATEUR DE STATUT ANIMÉ */}
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {friend.isOnline ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative"
                        >
                          <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                            <Wifi className="w-2 h-2 text-white" />
                          </div>
                          {/* PULSE EFFECT */}
                          <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                        </motion.div>
                      ) : (
                        <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <WifiOff className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INFORMATIONS AMI */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {friend.name}
                      </span>

                      {/* BADGE MESSAGES NON LUS ULTRA-MODERNE */}
                      {friend.unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg"
                        >
                          <MessageCircle className="w-3 h-3" />
                          {friend.unreadCount}
                        </motion.div>
                      )}
                    </div>

                    {/* STATUT ET DERNIÈRE CONNEXION */}
                    <div className="flex items-center gap-2">
                      {friend.isOnline ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          En ligne
                        </div>
                      ) : friend.lastSeen ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          Vu {formatLastSeen(friend.lastSeen)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          Hors ligne
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ICÔNE MESSAGE */}
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </motion.div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          // ÉTAT VIDE ULTRA-MODERNE AFRICAIN
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-4"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <Globe className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              {/* Motifs décoratifs africains */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Aucun ami trouvé
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Vos amis apparaîtront ici quand ils seront actifs sur la plateforme.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Découvrir des amis
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* FOOTER AVEC STATISTIQUES */}
      {totalFriends > 0 && (
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border-t border-emerald-200/30 dark:border-emerald-800/30">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalFriends} ami{totalFriends > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {onlineCount} en ligne
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
