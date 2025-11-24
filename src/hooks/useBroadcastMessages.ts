import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/notifications.utils';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  sent_at: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'feature' | 'maintenance' | 'security' | 'event';
}

interface CreateBroadcastInput {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'feature' | 'maintenance' | 'security' | 'event';
}

export const useBroadcastMessages = () => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['broadcast-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select(`
          *,
          profiles:created_by (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (BroadcastMessage & { profiles: { name: string; username: string } })[];
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: async (input: CreateBroadcastInput) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create broadcast message
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcast_messages')
        .insert({
          title: input.title,
          message: input.message,
          priority: input.priority,
          category: input.category,
          created_by: user.id,
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      // Send notifications to all users via database function
      const { error: notifError } = await supabase.rpc('send_broadcast_to_users', {
        p_broadcast_id: broadcast.id,
        p_title: input.title,
        p_message: input.message,
      });

      if (notifError) throw notifError;

      // Get all active user IDs for push notifications
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .or('status.is.null,status.eq.active');

      if (!usersError && users) {
        // Send push notifications in batches
        const userIds = users.map(u => u.id);
        await sendPushNotification({
          userIds,
          title: input.title,
          body: input.message,
          data: { type: 'broadcast', broadcastId: broadcast.id },
        });
      }

      return broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-messages'] });
      toast.success('Message broadcast envoyé à tous les utilisateurs');
    },
    onError: (error) => {
      console.error('Error sending broadcast:', error);
      toast.error('Erreur lors de l\'envoi du message broadcast');
    },
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-messages'] });
      toast.success('Message broadcast supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    messages,
    isLoading,
    sendBroadcast,
    deleteBroadcast,
  };
};
