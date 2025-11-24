import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { AboutSection } from '@/components/profile/AboutSection';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { PhotosSection } from '@/components/profile/PhotosSection';
import { VideosSection } from '@/components/profile/VideosSection';
import { ProfilePostsSection } from '@/components/profile/ProfilePostsSection';
import { TaggedSection } from '@/components/profile/TaggedSection';
import { Loader2 } from 'lucide-react';

const ProfilePage = () => {
  const params = useParams<{ userId?: string; username?: string }>();
  const userId = params.userId || params.username; // Support both route patterns
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  // Redirect to own profile if no userId
  useEffect(() => {
    if (!authLoading && !userId && user) {
      navigate(`/profile/${user.id}`);
    }
  }, [userId, user, authLoading, navigate]);

  // Fetch profile
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', userId, refreshKey],
    queryFn: async () => {
      if (!userId) {
        console.log('[ProfilePage] No userId provided');
        return null;
      }
      console.log('[ProfilePage] Fetching profile for userId:', userId);
      
      // Check if userId is a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(isUUID ? 'id' : 'username', userId)
        .single();
      
      if (error) {
        console.error('[ProfilePage] Error fetching profile:', error);
        throw error;
      }
      console.log('[ProfilePage] Profile data received:', data);
      return data;
    },
    enabled: !!userId,
    retry: 1
  });

  const isOwnProfile = user?.id === profile?.id;

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

  // Fetch user posts - removed, now handled in ProfilePostsSection

  const handleProfileUpdate = () => {
    setRefreshKey(prev => prev + 1);
    refetchProfile();
  };

  if (authLoading || profileLoading) {
    console.log('[ProfilePage] Loading state - authLoading:', authLoading, 'profileLoading:', profileLoading);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError) {
    console.error('[ProfilePage] Profile error:', profileError);
  }

  if (!profile) {
    console.log('[ProfilePage] No profile data - profile:', profile, 'error:', profileError);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profil introuvable</h1>
          <p className="text-muted-foreground">Ce profil n'existe pas ou a été supprimé.</p>
        </div>
      </div>
    );
  }

  console.log('[ProfilePage] Profile loaded successfully:', profile.name);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <ProfileHeader 
          profile={profile}
          friendsCount={friendsCount}
          isOwnProfile={isOwnProfile}
          friendshipStatus={friendshipStatus as any}
          onProfileUpdate={handleProfileUpdate}
        />

        <ProfileTabs>
          {{
            posts: <ProfilePostsSection userId={profile.id} onPostDelete={handleProfileUpdate} />,
            about: <AboutSection profile={profile} isOwnProfile={isOwnProfile} onProfileUpdate={handleProfileUpdate} />,
            friends: <FriendsSection userId={profile.id} />,
            photos: <PhotosSection userId={profile.id} />,
            videos: <VideosSection userId={profile.id} />,
            tagged: <TaggedSection userId={profile.id} onPostDelete={handleProfileUpdate} />
          }}
        </ProfileTabs>
      </div>
    </div>
  );
};

export default ProfilePage;