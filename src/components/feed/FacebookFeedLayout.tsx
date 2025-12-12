import { ReactNode, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { FacebookCreatePost } from '@/components/post/FacebookCreatePost';
import { ModernStories } from '@/components/feed/ModernStories';
import { VoicePostsSection } from '@/components/VoicePostsSection';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <PushNotificationPrompt userId={user.id} />

      <div className="max-w-7xl mx-auto pt-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar gauche - Navigation */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Navigation principale */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                <nav className="space-y-1">
                  <a href="/feed" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-9 9a1 1 0 001.414 1.414L2 12.414V19a1 1 0 001 1h3a1 1 0 001-1v-3h2v3a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-9-9z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Accueil</span>
                  </a>

                  <a href="/friends" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Amis</span>
                  </a>

                  <a href="/groups" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Groupes</span>
                  </a>

                  <a href="/marketplace" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Marketplace</span>
                  </a>
                </nav>
              </div>
            </div>
          </div>

          {/* Zone centrale - Contenu principal */}
          <div className="lg:col-span-9 xl:col-span-6">
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

              {/* Posts Vocaux Section */}
              <VoicePostsSection />

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

              {/* Friend Suggestions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Connexions suggérées</h3>
                  <a href="/friend-suggestions" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Voir tout
                  </a>
                </div>

                <div className="space-y-3">
                  {suggestionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
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
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <SmartFriendSuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          onHide={hideSuggestion}
                          variant="compact"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">
                        Aucune suggestion disponible pour le moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Stats */}
              {userStats && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Vos statistiques</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Publications</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{userStats.postsThisWeek || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">❤️</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Likes reçus</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{userStats.likesReceived || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Commentaires reçus</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{userStats.commentsReceived || 0}</span>
                    </div>
                  </div>
                </div>
              )}
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
