import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUserModeration = () => {
  const banUser = async (userId: string, reason: string, durationDays?: number) => {
    const { error } = await supabase.rpc('ban_user', {
      p_user_id: userId,
      p_reason: reason,
      p_duration_days: durationDays || null
    });

    if (error) {
      toast.error('Erreur lors du bannissement');
      return false;
    }

    toast.success(durationDays 
      ? `Utilisateur banni pour ${durationDays} jours` 
      : 'Utilisateur banni définitivement'
    );
    return true;
  };

  const unbanUser = async (userId: string) => {
    const { error } = await supabase.rpc('unban_user', {
      p_user_id: userId
    });

    if (error) {
      toast.error('Erreur lors du débannissement');
      return false;
    }

    toast.success('Utilisateur débanni');
    return true;
  };

  const suspendUser = async (userId: string, reason: string, days: number) => {
    const { error } = await supabase.rpc('suspend_user_rpc', {
      p_user_id: userId,
      p_reason: reason,
      p_duration_days: days
    });

    if (error) {
      toast.error(error.message || 'Erreur lors de la suspension');
      return false;
    }

    toast.success(`Utilisateur suspendu pour ${days} jours`);
    return true;
  };

  return {
    banUser,
    unbanUser,
    suspendUser
  };
};
