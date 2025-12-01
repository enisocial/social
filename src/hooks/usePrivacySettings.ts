import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  show_online_status: boolean;
  allow_messages_from: 'public' | 'friends' | 'private';
  show_email: boolean;
}

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les paramètres de confidentialité
  const { data: privacySettings, isLoading, error } = useQuery({
    queryKey: ['privacy-settings', user?.id],
    queryFn: async (): Promise<PrivacySettings> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      // Valeurs par défaut si pas de données
      return data || {
        profile_visibility: 'public',
        show_online_status: true,
        allow_messages_from: 'public',
        show_email: false
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation pour sauvegarder les paramètres
  const saveMutation = useMutation({
    mutationFn: async (settings: PrivacySettings) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('account_settings')
        .upsert({
          user_id: user.id,
          ...settings
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings', user?.id] });
      toast.success('Paramètres de confidentialité sauvegardés');
    },
    onError: (error) => {
      console.error('Error saving privacy settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres de confidentialité');
    },
  });

  return {
    privacySettings,
    isLoading,
    error,
    savePrivacySettings: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
};
