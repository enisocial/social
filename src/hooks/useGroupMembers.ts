import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  profile: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useGroupMembers = (groupId: string) => {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profile:profiles(id, name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !!groupId
  });

  const addMember = useMutation({
    mutationFn: async ({ userId, role = 'member' }: {
      userId: string;
      role?: 'admin' | 'moderator' | 'member';
    }) => {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.success('Membre ajouté');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout');
    }
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: {
      memberId: string;
      role: 'admin' | 'moderator' | 'member';
    }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.success('Rôle mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast.success('Membre retiré');
    },
    onError: () => {
      toast.error('Erreur lors du retrait');
    }
  });

  return {
    members,
    isLoading,
    addMember,
    updateMemberRole,
    removeMember
  };
};
