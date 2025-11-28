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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />

      <PushNotificationPrompt userId={user.id} />

      <div className="max-w-6xl mx-auto pt-4 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar gauche - Navigation */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-2">
              {/* Navigation principale */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2">
                <nav className="space-y-1">
                  <a href="/feed" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-9 9a1 1 0 001.414 1.414L2 12.414V19a1 1 0 001 1h3a1 1 0 001-1v-3h2v3a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-9-9z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Accueil</span>
                  </a>

                  <a href="/friends" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Amis</span>
                  </a>

                  <a href="/groups" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Groupes</span>
                  </a>

                  <a href="/marketplace" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Marketplace</span>
                  </a>
                </nav>
              </div>

              {/* Raccourcis */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2">
                <h3 className="text-gray-500 dark:text-gray-400 font-semibold text-sm mb-2 px-2">Vos raccourcis</h3>
                <div className="space-y-1">
                  <a href="/live" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-gray-100">En direct</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Zone centrale - Contenu principal */}
          <div className="lg:col-span-6">
            <div className="space-y-4">
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
            <div className="sticky top-20 space-y-4">
              {/* Amis en ligne */}
              <OnlineFriendsSidebar />

              {/* Suggestions d'amis */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Suggestions d'amis</h3>
                  <a href="/friend-suggestions" className="text-blue-600 text-sm hover:underline">Voir tout</a>
                </div>
                <div className="space-y-3">
                  <div className="text-center text-gray-500 text-sm py-4">
                    Suggestions à venir
                  </div>
                </div>
              </div>

              {/* Activité récente */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Votre activité</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>📝 3 publications cette semaine</div>
                  <div>❤️ 12 likes reçus</div>
                  <div>💬 8 commentaires</div>
                </div>
              </div>
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
