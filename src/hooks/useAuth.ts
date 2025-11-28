import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get initial session synchronously from cache for faster initial load
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          username
        }
      }
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Compte créé avec succès !');
    return { data };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Starting sign in process for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Sign in error:', error);
      toast.error(error.message);
      return { error };
    }

    console.log('✅ Sign in successful for:', data.user?.email);
    toast.success('Connexion réussie !');

    // ADMIN FORCE REDIRECT - Priorité absolue
    if (data.user && data.user.email === 'admin@binkaa.com') {
      console.log('👑 ADMIN FORCE REDIRECT: admin@binkaa.com detected');
      console.log('🚀 Redirecting to admin dashboard immediately');

      // Force redirect with timeout to ensure it happens
      setTimeout(() => {
        navigate('/admin-dashboard', { replace: true });
      }, 100);

      return { data };
    }

    // Check user role and redirect accordingly
    if (data.user) {
      console.log('🔍 Checking role for user:', data.user.email, 'ID:', data.user.id);

      // Check admin role
      const { data: adminRole, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      console.log('👑 Admin role check:', { adminRole, adminError });

      if (adminRole) {
        console.log('🚀 Redirecting admin to dashboard');
        navigate('/admin-dashboard', { replace: true });
        return { data };
      }

      // Check moderator role
      const { data: modRole, error: modError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'moderator')
        .maybeSingle();

      console.log('🛡️ Moderator role check:', { modRole, modError });

      if (modRole) {
        console.log('🚀 Redirecting moderator to dashboard');
        navigate('/moderator', { replace: true });
        return { data };
      }

      console.log('👤 Redirecting regular user to feed');

      // Prefetch feed data for faster loading
      if (data.user?.id) {
        prefetchFeedData(data.user.id);
      }
    }

    navigate('/feed', { replace: true });
    return { data };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/feed`
      }
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    return { data };
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Email de réinitialisation envoyé !');
    return { data };
  };

  const signOut = async () => {
    console.log('🚪 SIGNOUT STARTED - User:', user?.email);

    // Set user offline before signing out
    if (user?.id) {
      console.log('📴 Setting user offline before logout...');
      try {
        // Use RPC function which has SECURITY DEFINER and will work even during logout
        await supabase.rpc('update_user_presence', {
          p_user_id: user.id,
          p_online: false
        });

        console.log('✅ User set to offline');
        // Wait a bit to ensure the update propagates
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Error setting offline status:', error);
      }
    }

    console.log('🔐 Calling supabase.auth.signOut()...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ SignOut error:', error);
      toast.error(error.message);
      return { error };
    }

    console.log('✅ Supabase signOut successful');
    toast.success('Déconnexion réussie !');

    console.log('🔄 Redirecting to /auth...');
    // Force a full page reload to /auth to ensure clean state
    window.location.href = '/auth';
    console.log('🚀 Redirect initiated to /auth');
    return { error: null };
  };

  // Prefetch feed data for faster loading on login
  const prefetchFeedData = async (userId: string) => {
    try {
      console.log('🚀 Prefetching feed data for faster loading...');

      // Prefetch the first page of the smart feed
      await queryClient.prefetchQuery({
        queryKey: ['smart-feed', userId, 'recommended'],
        queryFn: async () => {
          const pageSize = 10;
          const offset = 0;

          // Récupération des posts optimisée pour le prefetch
          let postsQuery = supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_fkey(username, name, avatar_url),
              post_media(id, media_url, media_type, order_index)
            `)
            .eq('privacy', 'public')
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

          const { data: rawPosts, error: postsError } = await postsQuery;

          if (postsError || !rawPosts) {
            console.error('❌ Error prefetching posts:', postsError);
            return { posts: [], nextOffset: null };
          }

          // Statistiques simplifiées pour le prefetch
          const postIds = rawPosts.map(p => p.id);

          const [likesData, commentsData, userLikesData] = await Promise.all([
            supabase.from('likes').select('post_id', { count: 'exact' }).in('post_id', postIds),
            supabase.from('comments').select('post_id', { count: 'exact' }).in('post_id', postIds),
            supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', userId)
          ]);

          const likesCount: Record<string, number> = {};
          const commentsCount: Record<string, number> = {};
          const userLikedSet = new Set<string>();

          likesData.data?.forEach(like => { likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1; });
          commentsData.data?.forEach(comment => { commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1; });
          userLikesData.data?.forEach(like => userLikedSet.add(like.post_id));

          const posts = rawPosts.map(post => ({
            id: post.id,
            content: post.content || '',
            media_url: post.media_url,
            media_type: post.media_type,
            privacy: post.privacy || 'public',
            created_at: post.created_at,
            updated_at: post.updated_at,
            user_id: post.user_id,
            username: post.profiles?.username || 'unknown',
            name: post.profiles?.name || 'Unknown User',
            avatar_url: post.profiles?.avatar_url || null,
            likes_count: likesCount[post.id] || 0,
            comments_count: commentsCount[post.id] || 0,
            shares_count: 0,
            views_count: 0,
            user_liked: userLikedSet.has(post.id),
            relevance_score: 0,
            engagement_prediction: 0,
            final_score: 0,
            post_media: post.post_media || []
          }));

          return { posts, nextOffset: posts.length === pageSize ? 1 : null };
        },
        staleTime: 30 * 1000, // Cache for 30 seconds
      });

      console.log('✅ Feed data prefetched successfully');
    } catch (error) {
      console.error('❌ Error prefetching feed data:', error);
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    signOut
  };
};
