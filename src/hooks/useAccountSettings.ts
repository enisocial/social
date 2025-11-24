import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PostPrivacy = 'public' | 'friends' | 'private';

export interface AccountSettings {
  id: string;
  user_id: string;
  profile_visibility: PostPrivacy;
  allow_messages_from: PostPrivacy;
  show_online_status: boolean;
  show_location: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_birthdate: boolean;
  show_relationship: boolean;
  show_work: boolean;
  created_at: string;
  updated_at: string;
}

export const useAccountSettings = (userId?: string) => {
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const fetchSettings = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('account_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      // Create default settings if they don't exist
      await createDefaultSettings();
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const createDefaultSettings = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('account_settings')
      .insert({
        user_id: userId,
        profile_visibility: 'public',
        allow_messages_from: 'public',
        show_online_status: true,
        show_location: true,
        show_phone: false,
        show_email: false,
        show_birthdate: true,
        show_relationship: true,
        show_work: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default settings:', error);
    } else {
      setSettings(data);
    }
  };

  const updateSettings = async (updates: Partial<AccountSettings>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('account_settings')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast.error('Erreur lors de la mise à jour des paramètres');
      return;
    }

    toast.success('Paramètres mis à jour');
    fetchSettings();
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
