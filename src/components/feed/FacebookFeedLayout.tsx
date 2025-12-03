import { ReactNode, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { FacebookCreatePost } from '@/components/post/FacebookCreatePost';
import { ModernStories } from '@/components/feed/ModernStories';
import { LiveBubbles } from '@/components/live/LiveBubbles';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { OnlineFriendsSidebar } from './OnlineFriendsSidebar';
import { CreateStory } from '@/components/CreateStory';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { SmartFriendSuggestionCard } from '@/components/friends/SmartFriendSuggestionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface FacebookFeedLayoutProps {
  children: ReactNode;
  showStories?: boolean;
  showCreatePost?: boolean;
}

export const FacebookFeedLayout = ({
  children,
  showStories = true,
  showCreatePost = true
}: FacebookFeedLayoutProps) => {
  const { user } = useAuth();
  const { storyGroups, createStory, uploadProgress, isUploading } = useStories();
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  // Suggestions d'amis pour la sidebar
  const { suggestions, loading: suggestionsLoading, hideSuggestion } = useSmartFriendSuggestions(user?.id, 3);

  // Statistiques réelles de l'utilisateur via RPC
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-impact-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        // Utiliser la fonction RPC existante pour récupérer les vraies statistiques
        const { data, error } = await supabase.rpc('get_user_analytics', {
          user_id_param: user.id
        });

        if (error) {
          console.error('Erreur RPC get_user_analytics:', error);
          return {
            postsThisWeek: 0,
            likesReceived: 0,
            commentsReceived: 0
          };
        }

        // La fonction RPC retourne un tableau, prendre le premier élément
        const stats = Array.isArray(data) ? data[0] : data;

        return {
          postsThisWeek: stats?.total_posts || 0,
          likesReceived: stats?.total_likes || 0,
          commentsReceived: stats?.total_comments || 0
        };
      } catch (error) {
        console.error('Erreur récupération stats:', error);
        return {
          postsThisWeek: 0,
          likesReceived: 0,
          commentsReceived: 0
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <PushNotificationPrompt userId={user.id} />

      <div className="max-w-7xl mx-auto pt-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar gauche - Navigation */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-2">
              {/* Navigation principale */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-3">
                <nav className="space-y-2">
                  <a href="/feed" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 transition-all duration-200 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-9 9a1 1 0 001.414 1.414L2 12.414V19a1 1 0 001 1h3a1 1 0 001-1v-3h2v3a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-9-9z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Accueil</span>
                  </a>

                  <a href="/friends" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 transition-all duration-200 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Communauté</span>
                  </a>

                  <a href="/groups" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Groupes</span>
                  </a>

                  <a href="/marketplace" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 transition-all duration-200 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Marché</span>
                  </a>
                </nav>
              </div>

              {/* Raccourcis */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-3">
                <h3 className="text-gray-600 dark:text-gray-300 font-bold text-sm mb-3 px-2">Raccourcis rapides</h3>
                <div className="space-y-2">
                  <a href="/live" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 transition-all duration-200 group">
                    <div className="w-9 h-9 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">En direct</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Zone centrale - Contenu principal */}
          <div className="lg:col-span-6">
            <div className="space-y-2">
              {/* Stories */}
              {showStories && (
                <ModernStories
                  storyGroups={storyGroups}
                  onCreateStory={() => setCreateStoryOpen(true)}
                  currentUserAvatar={profile?.avatar_url || undefined}
                  currentUserName={profile?.name}
                />
              )}

              {/* Créer un post */}
              {showCreatePost && <FacebookCreatePost />}

              {/* Contenu personnalisé */}
              {children}
            </div>
          </div>

          {/* Sidebar droite - Suggestions et activité */}
          <div className="hidden xl:block xl:col-span-3">
            <div className="sticky top-20 space-y-6">
              {/* Amis en ligne */}
              <OnlineFriendsSidebar />

              {/* Suggestions de connexion - DESIGN MODERNE AFRICAIN */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-white/90 via-amber-50/80 to-orange-50/80 dark:from-gray-800/90 dark:via-amber-950/20 dark:to-orange-950/20 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/40 dark:border-amber-800/40 p-6"
              >
                {/* HEADER AVEC DESIGN AFRICAIN */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Connexions suggérées</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Découvrez votre communauté</p>
                    </div>
                  </div>
                  <a
                    href="/friend-suggestions"
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-semibold hover:underline transition-all duration-200 flex items-center gap-1 group"
                  >
                    <span>Voir tout</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                  </a>
                </div>

                {/* CONTENU DES SUGGESTIONS */}
                <div className="space-y-3">
                  {suggestionsLoading ? (
                    // SKELETON LOADER MODERNE
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 animate-pulse">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : suggestions.length > 0 ? (
                    // SUGGESTIONS RÉELLES
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <SmartFriendSuggestionCard
                            suggestion={suggestion}
                            onHide={hideSuggestion}
                            variant="compact"
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    // ÉTAT VIDE AVEC DESIGN AFRICAIN
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8 px-4"
                    >
                      <div className="relative mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-full mx-auto flex items-center justify-center shadow-lg">
                          <div className="text-3xl">🌍</div>
                        </div>
                        {/* Motifs africains décoratifs */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
                        <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Communauté en expansion</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Nous travaillons à vous connecter avec des personnes partageant vos intérêts.
                        Revenez bientôt pour découvrir de nouvelles suggestions !
                      </p>
                      <div className="mt-4 flex justify-center">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* FOOTER AVEC STATISTIQUES */}
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 pt-4 border-t border-amber-200/50 dark:border-amber-800/50"
                  >
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>{suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span>Actualisé</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* VOTRE IMPACT - DESIGN MODERNE AFRICAIN AVEC DONNÉES RÉELLES */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gradient-to-br from-white/90 via-emerald-50/80 to-teal-50/80 dark:from-gray-800/90 dark:via-emerald-950/20 dark:to-teal-950/20 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/40 dark:border-emerald-800/40 p-6"
              >
                {/* HEADER AVEC ICÔNE AFRICAINE */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Votre impact</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Statistiques de cette semaine</p>
                  </div>
                </div>

                {/* CONTENU DES STATISTIQUES */}
                <div className="space-y-4">
                  {statsLoading ? (
                    // SKELETON LOADER
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 animate-pulse">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                          </div>
                          <div className="text-right">
                            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-8 mb-1"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* PUBLICATIONS */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30 hover:shadow-lg transition-all duration-300">
                          {/* EFFET DE FOND ANIMÉ */}
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* ICÔNE */}
                          <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-xl">📝</span>
                          </div>

                          {/* CONTENU */}
                          <div className="relative z-10 flex-1">
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-base">
                              {userStats?.postsThisWeek || 0} publication{userStats?.postsThisWeek !== 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cette semaine</p>
                          </div>

                          {/* BADGE DE PROGRÈS */}
                          <div className="relative z-10 text-right">
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                              {userStats?.postsThisWeek || 0}
                            </div>
                            <div className="w-16 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min((userStats?.postsThisWeek || 0) / 10 * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* LIKES REÇUS */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/30 dark:via-pink-950/20 dark:to-red-950/30 border border-rose-200/50 dark:border-rose-800/30 hover:shadow-lg transition-all duration-300">
                          {/* EFFET DE FOND ANIMÉ */}
                          <div className="absolute inset-0 bg-gradient-to-r from-rose-400/0 via-rose-400/5 to-rose-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* ICÔNE */}
                          <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-xl">❤️</span>
                          </div>

                          {/* CONTENU */}
                          <div className="relative z-10 flex-1">
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-base">
                              {userStats?.likesReceived || 0} like{userStats?.likesReceived !== 1 ? 's' : ''} reçu{userStats?.likesReceived !== 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Interactions positives</p>
                          </div>

                          {/* BADGE DE PROGRÈS */}
                          <div className="relative z-10 text-right">
                            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                              {userStats?.likesReceived || 0}
                            </div>
                            <div className="w-16 h-2 bg-rose-200 dark:bg-rose-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min((userStats?.likesReceived || 0) / 50 * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* COMMENTAIRES REÇUS */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-violet-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-violet-950/30 border border-indigo-200/50 dark:border-indigo-800/30 hover:shadow-lg transition-all duration-300">
                          {/* EFFET DE FOND ANIMÉ */}
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-indigo-400/5 to-indigo-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* ICÔNE */}
                          <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-xl">💬</span>
                          </div>

                          {/* CONTENU */}
                          <div className="relative z-10 flex-1">
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-base">
                              {userStats?.commentsReceived || 0} commentaire{userStats?.commentsReceived !== 1 ? 's' : ''} reçu{userStats?.commentsReceived !== 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Discussions engagées</p>
                          </div>

                          {/* BADGE DE PROGRÈS */}
                          <div className="relative z-10 text-right">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {userStats?.commentsReceived || 0}
                            </div>
                            <div className="w-16 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min((userStats?.commentsReceived || 0) / 25 * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* FOOTER AVEC MOTIVATION AFRICAINE */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/50"
                >
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "Chaque interaction compte dans notre communauté panafricaine 🌍"
                    </p>
                    <div className="flex justify-center gap-1 mt-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Story Dialog */}
      <CreateStory
        open={createStoryOpen}
        onOpenChange={setCreateStoryOpen}
        onCreateStory={async (file) => {
          await createStory(file);
          setCreateStoryOpen(false);
        }}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
      />
    </div>
  );
};
