import { useState, useMemo, useCallback } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useInstantMessaging } from '@/hooks/useInstantMessaging';
import { useMessenger } from '@/contexts/MessengerContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Sparkles,
  MessageCircle,
  Users,
  Clock,
  Activity,
  Heart,
  ArrowLeft,
  Globe,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { usePresence } from '@/hooks/usePresence';

const Messages = () => {
  const { conversations, loading, createConversation } = useConversations();
  const { markConversationAsRead } = useInstantMessaging();
  const { openBubble } = useMessenger();

  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  /** ---------------------------
   * 🔍 Recherche utilisateur
   ------------------------------ */
  const handleSearchUsers = useCallback(async () => {
    if (!userSearch.trim()) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url')
      .or(`username.ilike.%${userSearch}%,name.ilike.%${userSearch}%`)
      .limit(10);

    setSearchResults(data || []);
  }, [userSearch]);

  /** ---------------------------
   * ➕ Démarrer une conversation
   ------------------------------ */
  const handleStartConversation = useCallback(
    async (userId: string, user: any) => {
      const conversationId = await createConversation(userId);
      if (!conversationId) return;

      setNewChatOpen(false);

      // Ouvrir la chatbubble avec la nouvelle conversation
      openBubble(conversationId, user);
    },
    [createConversation, openBubble]
  );

  /** ---------------------------
   * 🧩 Filtrer les conversations
   ------------------------------ */
  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();

    if (!query) return conversations || [];

    return (conversations || []).filter((conv) => {
      const name = conv.otherUser?.name?.toLowerCase() || '';
      const username = conv.otherUser?.username?.toLowerCase() || '';
      return name.includes(query) || username.includes(query);
    });
  }, [conversations, searchQuery]);

  // Statistiques des conversations
  const stats = useMemo(() => {
    const totalUnread = filteredConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    const activeConversations = filteredConversations.filter(conv => conv.lastMessage).length;

    return {
      total: filteredConversations.length,
      unread: totalUnread,
      active: activeConversations
    };
  }, [filteredConversations]);

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
                <MessageSquare className="w-10 h-10 text-white" />
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
                Messages
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🌍 Connectez-vous instantanément avec votre communauté panafricaine
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
                  {stats.total} conversation{stats.total !== 1 ? 's' : ''}
                </span>
              </div>

              {stats.unread > 0 && (
                <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-red-200/50">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {stats.unread} message{stats.unread !== 1 ? 's' : ''} non lu{stats.unread !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-cyan-200/50">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {stats.active} conversation{stats.active !== 1 ? 's' : ''} active{stats.active !== 1 ? 's' : ''}
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

          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl rounded-full px-6 py-3">
                <Sparkles className="w-4 h-4" />
                Nouveau message
              </Button>
            </DialogTrigger>

            {/* MODAL ULTRA-MODERNE */}
            <DialogContent className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl max-w-md">
              <DialogHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Nouvelle conversation
                </DialogTitle>
                <p className="text-gray-600 dark:text-gray-400">
                  Trouvez quelqu'un avec qui discuter
                </p>
              </DialogHeader>

              <div className="space-y-6">
                {/* BARRE DE RECHERCHE ULTRA-MODERNE */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-emerald-500" />
                  </div>
                  <Input
                    placeholder="🔍 Rechercher un utilisateur..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    className="pl-12 h-12 text-base border-2 border-emerald-200/50 focus:border-emerald-400 rounded-xl shadow-sm"
                  />
                  <Button
                    onClick={handleSearchUsers}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-lg"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>

                {/* RÉSULTATS DE RECHERCHE */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.length === 0 && userSearch ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Aucun utilisateur trouvé pour "{userSearch}"
                      </p>
                    </div>
                  ) : searchResults.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="p-4 cursor-pointer group hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-emerald-200/50 rounded-xl"
                        onClick={() => handleStartConversation(user.id, user)}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-emerald-200/50 group-hover:border-emerald-300 transition-colors">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                              {user.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 transition-colors">
                              {user?.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{user?.username}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MessageCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* BARRE DE RECHERCHE PRINCIPALE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="w-6 h-6 text-emerald-500" />
              </div>
              <Input
                placeholder="🔍 Rechercher dans vos conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 h-14 text-base border-2 border-emerald-200/50 focus:border-emerald-400 rounded-xl shadow-sm bg-white/80 dark:bg-gray-800/80"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* CONTENU PRINCIPAL */}
        {loading ? (
          // SKELETON LOADER ULTRA-MODERNE
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-48 animate-pulse"></div>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-full animate-pulse"></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // ÉTAT VIDE ULTRA-MODERNE AFRICAIN
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-8"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                <MessageSquare className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              {/* Motifs décoratifs africains */}
              <div className="absolute -top-3 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-2 -left-3 w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              {searchQuery ? '🔍 Aucune conversation trouvée' : '💬 Aucune conversation'}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Essayez de modifier vos termes de recherche ou vérifiez l\'orthographe.'
                : 'Commencez à construire des connexions authentiques en lançant votre première conversation panafricaine.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setNewChatOpen(true)}
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl px-8 py-3 text-lg rounded-full"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Démarrer une conversation
              </Button>

              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="px-8 py-3 text-lg border-2 border-gray-300 hover:border-emerald-300 rounded-full"
                >
                  Effacer la recherche
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          // LISTE DES CONVERSATIONS ULTRA-MODERNE
          <div className="space-y-4">
            {filteredConversations.map((conv, index) => {
              const other = conv.otherUser || { id: "", name: "", username: "", avatar_url: null };

              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="group"
                >
                  <Card
                    className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer rounded-2xl overflow-hidden"
                    onClick={() => {
                      console.log('👆 Clic sur conversation depuis Messages:', other.name, 'ID:', conv.id);
                      openBubble(conv.id, conv.otherUser);
                      if (conv.unreadCount > 0) {
                        markConversationAsRead(conv.id);
                      }
                    }}
                  >
                    {/* EFFET DE FOND ANIMÉ */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/3 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl"></div>

                    <div className="relative p-6">
                      <div className="flex items-center gap-4">
                        {/* AVATAR ULTRA-MODERNE */}
                        <div className="relative">
                          <Avatar className="w-16 h-16 border-3 border-emerald-200/50 dark:border-emerald-800/50 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-all duration-300 shadow-lg">
                            <AvatarImage src={other?.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                              {other?.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>

                          {/* BADGE MESSAGES NON LUS ULTRA-MODERNE */}
                          {conv.unreadCount > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 px-1"
                            >
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </motion.div>
                          )}
                        </div>

                        {/* CONTENU DE LA CONVERSATION */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {other?.name || "Utilisateur supprimé"}
                            </h3>

                            {conv.lastMessage && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                                  locale: fr,
                                  addSuffix: false
                                })}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                            {conv.lastMessage?.content || (
                              <span className="italic text-gray-400 dark:text-gray-500">
                                Commencez une conversation...
                              </span>
                            )}
                          </p>

                          {/* BADGES DE STATUT */}
                          <div className="flex items-center gap-2 mt-3">
                            {conv.unreadCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
                                <Activity className="w-3 h-3" />
                                {conv.unreadCount} nouveau{conv.unreadCount > 1 ? 'x' : ''}
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full font-medium">
                              <Heart className="w-3 h-3" />
                              Actif
                            </span>
                          </div>
                        </div>

                        {/* ICÔNE MESSAGE ANIMÉE */}
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 ml-4"
                        >
                          <MessageCircle className="w-6 h-6" />
                        </motion.div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
