import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profile: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useGroupJoinRequests = (groupId: string) => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          profile:profiles!user_id(name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GroupJoinRequest[];
    },
    enabled: !!groupId
  });

  const sendRequest = useMutation({
    mutationFn: async ({ groupId, message }: { groupId: string; message?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: message || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande envoyée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi');
    }
  });

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: request, error: fetchError } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Ajouter le membre au groupe
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: request.group_id,
          user_id: request.user_id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.success('Demande acceptée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'acceptation');
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      toast.success('Demande refusée');
    },
    onError: () => {
      toast.error('Erreur lors du refus');
    }
  });

  return {
    requests,
    isLoading,
    sendRequest,
    approveRequest,
    rejectRequest
  };
};
