import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'admin' | 'moderator' | 'user' | null;

export const useRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Check for admin role first
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        setRole('admin');
        setLoading(false);
        return;
      }

      // Check for moderator role
      const { data: modRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'moderator')
        .maybeSingle();

      if (modRole) {
        setRole('moderator');
        setLoading(false);
        return;
      }

      // Default to user role
      setRole('user');
      setLoading(false);
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setRole('user');
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const isAdminOrModerator = isAdmin || isModerator;

  const promoteToModerator = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'moderator' });

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action: 'PROMOTE_TO_MODERATOR',
        p_target_type: 'user',
        p_target_id: userId
      });

      toast.success('Utilisateur promu modérateur');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    role,
    loading,
    isAdmin,
    isModerator,
    isAdminOrModerator,
    promoteToModerator,
    checkUserRole
  };
};
