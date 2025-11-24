import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  status: string;
  priority: string;
  reason: string | null;
  reporter_id: string | null;
  moderator_id: string | null;
  moderator_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  metadata: Record<string, any>;
  reporter?: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useModeration = () => {
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moderation_queue')
      .select(`
        *,
        reporter:profiles!moderation_queue_reporter_id_fkey(name, username, avatar_url)
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQueue(data as ModerationItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const approveContent = async (id: string, notes?: string) => {
    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: 'approved',
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        moderator_notes: notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de l\'approbation');
      return;
    }

    toast.success('Contenu approuvé');
    fetchQueue();
  };

  const rejectContent = async (id: string, notes?: string) => {
    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: 'rejected',
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        moderator_notes: notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors du rejet');
      return;
    }

    toast.success('Contenu rejeté');
    fetchQueue();
  };

  const escalateContent = async (id: string, notes?: string) => {
    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: 'escalated',
        priority: 'urgent',
        moderator_notes: notes
      })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de l\'escalade');
      return;
    }

    toast.success('Contenu escaladé');
    fetchQueue();
  };

  return {
    queue,
    loading,
    refetch: fetchQueue,
    approveContent,
    rejectContent,
    escalateContent
  };
};
