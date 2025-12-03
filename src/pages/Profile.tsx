import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { ProfileCompletenessBanner } from '@/components/profile/ProfileCompletenessBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileJournal } from '@/components/profile/ProfileJournal';
import { AboutSection } from '@/components/profile/AboutSection';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { PhotosSection } from '@/components/profile/PhotosSection';
import { VideosSection } from '@/components/profile/VideosSection';
import { ActivitySummary } from '@/components/profile/ActivitySummary';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, User, Users, Images, Video, Info, Calendar, Loader2, HelpCircle, Shield, BookOpen, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const handleProfileUpdate = () => {
    // Invalidate relevant queries instead of reloading the page
    queryClient.invalidateQueries({ queryKey: ['profile', username] });
    if (profile?.id) {
      queryClient.invalidateQueries({ queryKey: ['friends-count', profile.id] });
      queryClient.invalidateQueries({ queryKey: ['friendship-status', user?.id, profile.id] });
      // Use the correct query key for completeness
      queryClient.invalidateQueries({ queryKey: ['profile-completeness', profile.id] });
    }
    // Also invalidate the completeness for the current user (for the banner)
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['profile-completeness', user.id] });
    }
  };

  console.log('🎯 PROFILE PAGE LOADED:', { username, user, authLoading });

  // Fetch profile by username or userId
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      if (!username) return null;

      // Check if username is a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(isUUID ? 'id' : 'username', username)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  // Fetch friends count
  const { data: friendsCount = 0 } = useQuery({
    queryKey: ['friends-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      return count || 0;
    },
    enabled: !!profile?.id
  });

  // Fetch friendship status
  const { data: friendshipStatus = 'none' } = useQuery({
    queryKey: ['friendship-status', user?.id, profile?.id],
    queryFn: async () => {
      if (!user || !profile?.id || user.id === profile.id) return 'none';

      const { data } = await supabase
        .from('friend_requests')
        .select('status, sender_id, receiver_id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
        .single();

      if (!data) return 'none';
      if (data.status === 'accepted') return 'friends';
      if (data.sender_id === user.id) return 'pending_sent';
      return 'pending_received';
    },
    enabled: !!user && !!profile?.id && user.id !== profile?.id
  });

  // Attendre que l'utilisateur et le profil soient chargés avant de déterminer si c'est le profil propriétaire
  const isOwnProfile = user?.id === profile?.id;

  if (authLoading || profileLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profil introuvable</h1>
          <p className="text-muted-foreground">Ce profil n'existe pas ou a été supprimé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Bannière de complétude (visible seulement pour le propriétaire) */}
        {isOwnProfile && <ProfileCompletenessBanner userId={profile.id} />}

        {/* Header avec couverture et profil */}
        <ProfileHeader
          profile={profile}
          friendsCount={friendsCount}
          isOwnProfile={isOwnProfile}
          friendshipStatus={friendshipStatus}
          onProfileUpdate={handleProfileUpdate}
        />

        {/* Navigation par onglets moderne et professionnelle */}
        <Tabs defaultValue="journal" className="w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-2 mb-8">
            <TabsList className="grid w-full grid-cols-6 h-14 bg-transparent gap-2">
              <TabsTrigger
                value="journal"
                className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
              >
                <Calendar className="h-5 w-5" />
                <span className="hidden sm:inline">Journal</span>
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
              >
                <Info className="h-5 w-5" />
                <span className="hidden sm:inline">À propos</span>
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
              >
                <Users className="h-5 w-5" />
                <span className="hidden sm:inline">Communauté</span>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-400 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
              >
                <Images className="h-5 w-5" />
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-400 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
              >
                <Video className="h-5 w-5" />
                <span className="hidden sm:inline">Vidéos</span>
              </TabsTrigger>
              {/* ONGLET AIDE - UNIQUEMENT POUR LE PROPRIÉTAIRE */}
              {isOwnProfile && (
                <TabsTrigger
                  value="help"
                  className="gap-3 rounded-xl font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/50 dark:hover:bg-gray-700/50"
                >
                  <HelpCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">Aide</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Contenu des onglets */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {/* Zone principale (3 colonnes sur 4) */}
            <div className="lg:col-span-3">
              <TabsContent value="journal" className="mt-0">
                <ProfileJournal
                  userId={profile.id}
                  onPostDelete={handleProfileUpdate}
                />
              </TabsContent>

              <TabsContent value="about" className="mt-0">
                <AboutSection
                  profile={profile}
                  isOwnProfile={isOwnProfile}
                  onProfileUpdate={handleProfileUpdate}
                />
              </TabsContent>

              <TabsContent value="friends" className="mt-0">
                <FriendsSection userId={profile.id} />
              </TabsContent>

              <TabsContent value="photos" className="mt-0">
                <PhotosSection userId={profile.id} />
              </TabsContent>

              <TabsContent value="videos" className="mt-0">
                <VideosSection userId={profile.id} />
              </TabsContent>

              {/* ONGLET AIDE - UNIQUEMENT POUR LE PROPRIÉTAIRE */}
              {isOwnProfile && (
                <TabsContent value="help" className="mt-0">
                <div className="space-y-6">
                  {/* HEADER DE LA SECTION AIDE */}
                  <div className="bg-gradient-to-br from-white/90 via-blue-50/80 to-indigo-50/80 dark:from-gray-800/90 dark:via-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/50 dark:border-blue-800/50 p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                        <HelpCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Centre d'aide</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Trouvez des réponses et obtenez de l'aide</p>
                      </div>
                    </div>

                    {/* GRILLE DES OPTIONS D'AIDE */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* CENTRE D'AIDE */}
                      <button
                        onClick={() => navigate('/help-center')}
                        className="group relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/30 hover:shadow-lg transition-all duration-300 text-left w-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                            <HelpCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Centre d'aide</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              Trouvez des réponses à vos questions et apprenez à utiliser la plateforme.
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* SIGNALER UN PROBLÈME */}
                      <button
                        onClick={() => navigate('/report-issue')}
                        className="group relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/30 hover:shadow-lg transition-all duration-300 text-left w-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Signaler un problème</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              Rapportez un bug ou un problème technique pour nous aider à améliorer.
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* CONDITIONS D'UTILISATION */}
                      <button
                        onClick={() => navigate('/terms')}
                        className="group relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/50 dark:border-green-800/30 hover:shadow-lg transition-all duration-300 text-left w-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/5 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Conditions d'utilisation</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              Découvrez les règles et conditions d'utilisation de notre plateforme.
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* POLITIQUE DE CONFIDENTIALITÉ */}
                      <button
                        onClick={() => navigate('/privacy')}
                        className="group relative overflow-hidden bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/30 hover:shadow-lg transition-all duration-300 text-left w-full"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Politique de confidentialité</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              Apprenez comment nous protégeons vos données personnelles.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SECTION QUESTIONS FRÉQUENTES */}
                  <div className="bg-gradient-to-br from-white/90 via-slate-50/80 to-gray-50/80 dark:from-gray-800/90 dark:via-slate-950/20 dark:to-gray-950/20 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                        <HelpCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Questions fréquentes</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Réponses aux questions les plus courantes</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-gray-200/30">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Comment modifier mon profil ?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Cliquez sur votre photo de profil, puis sélectionnez "Modifier le profil" pour mettre à jour vos informations.
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-gray-200/30">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Comment ajouter des amis ?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Utilisez la recherche pour trouver des personnes, puis cliquez sur "Ajouter en ami" depuis leur profil.
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-gray-200/30">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Comment publier du contenu ?</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Sur votre fil d'actualité, cliquez sur "Créer une publication" pour partager du texte, des photos ou des vidéos.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Vous ne trouvez pas la réponse à votre question ?
                        </p>
                        <Button
                          onClick={() => navigate('/help')}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Consulter le centre d'aide complet
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              )}
            </div>

            {/* Sidebar droite (1 colonne sur 4) */}
            <div className="lg:col-span-1">
              <ActivitySummary userId={profile.id} />
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
