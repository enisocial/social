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
import { MoreSection } from '@/components/profile/MoreSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, User, Users, Images, Video, Info, Calendar, Loader2 } from 'lucide-react';
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

  const isOwnProfile = user?.id === profile?.id;

  if (authLoading || profileLoading) {
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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

        {/* Navigation par onglets Facebook-like */}
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-12">
            <TabsTrigger value="journal" className="gap-2">
              <Calendar className="h-4 w-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Info className="h-4 w-4" />
              À propos
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              Amis
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Images className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="h-4 w-4" />
              Vidéos
            </TabsTrigger>
            <TabsTrigger value="more" className="gap-2">
              <User className="h-4 w-4" />
              Plus
            </TabsTrigger>
          </TabsList>

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

              <TabsContent value="more" className="mt-0">
                <MoreSection userId={profile.id} isOwnProfile={isOwnProfile} />
              </TabsContent>
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
