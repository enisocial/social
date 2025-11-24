import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  hometown: string | null;
  current_city: string | null;
  phone: string | null;
  public_email: string | null;
  website: string | null;
  birthdate: string | null;
  relationship_status: string | null;
  work: string | null;
  education: string | null;
  created_at: string;
}

export interface ProfileStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchStats();
      checkFollowing();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      toast.error('Erreur lors du chargement du profil');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!userId) return;

    const [posts, followers, following] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    setStats({
      postsCount: posts.count || 0,
      followersCount: followers.count || 0,
      followingCount: following.count || 0
    });
  };

  const checkFollowing = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) {
        toast.error('Erreur lors du désabonnement');
        return;
      }

      setIsFollowing(false);
      setStats(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
      toast.success('Désabonné');
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      if (error) {
        toast.error('Erreur lors de l\'abonnement');
        return;
      }

      setIsFollowing(true);
      setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
      toast.success('Abonné');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      toast.error('Erreur lors de la mise à jour du profil');
      return;
    }

    toast.success('Profil mis à jour');
    fetchProfile();
  };

  return {
    profile,
    stats,
    isFollowing,
    loading,
    toggleFollow,
    updateProfile,
    refetch: fetchProfile
  };
};
