import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  friendRequests: boolean;
  messages: boolean;
  likes: boolean;
  comments: boolean;
}

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les paramètres de notifications
  const { data: notificationSettings, isLoading, error } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async (): Promise<NotificationSettings> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      // Valeurs par défaut si pas de données
      return data || {
        emailNotifications: true,
        pushNotifications: true,
        friendRequests: true,
        messages: true,
        likes: false,
        comments: true
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation pour sauvegarder les paramètres
  const saveMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_notification_settings')
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
      queryClient.invalidateQueries({ queryKey: ['notification-settings', user?.id] });
      toast.success('Paramètres de notifications sauvegardés');
    },
    onError: (error) => {
      console.error('Error saving notification settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres de notifications');
    },
  });

  return {
    notificationSettings,
    isLoading,
    error,
    saveNotificationSettings: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
};
