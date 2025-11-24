import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export const usePlatformSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      return data as PlatformSetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('platform_settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Paramètre mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating setting:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const createSetting = useMutation({
    mutationFn: async (setting: {
      key: string;
      value: any;
      category: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('platform_settings')
        .insert({
          ...setting,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Paramètre créé avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating setting:', error);
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const deleteSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from('platform_settings')
        .delete()
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Paramètre supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting setting:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  return {
    settings,
    isLoading,
    updateSetting,
    createSetting,
    deleteSetting,
  };
};
