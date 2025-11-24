import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Connexion réussie !');
    
    // Check user role and redirect accordingly
    if (data.user) {
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        navigate('/admin', { replace: true });
        return { data };
      }

      const { data: modRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'moderator')
        .maybeSingle();

      if (modRole) {
        navigate('/moderator', { replace: true });
        return { data };
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
    // Set user offline before signing out
    if (user?.id) {
      try {
        // Use RPC function which has SECURITY DEFINER and will work even during logout
        await supabase.rpc('update_user_presence', {
          p_user_id: user.id,
          p_online: false
        });
        
        // Wait a bit to ensure the update propagates
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Déconnexion réussie !');
    
    // Force a full page reload to /auth to ensure clean state
    window.location.href = '/auth';
    return { error: null };
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
