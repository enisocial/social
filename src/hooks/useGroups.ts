import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  privacy: 'public' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  user_role?: 'admin' | 'moderator' | 'member';
}

export const useGroups = () => {
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Récupérer tous les groupes publics + les groupes privés dont on est membre
      const { data: publicGroups, error: publicError } = await supabase
        .from('groups')
        .select('*')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false });

      if (publicError) throw publicError;

      const { data: memberGroups, error: memberError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(role, user_id)
        `)
        .eq('privacy', 'private')
        .eq('group_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (memberError) throw memberError;

      // Combiner les deux listes et supprimer les doublons
      const allGroups = [...(publicGroups || []), ...(memberGroups || [])];
      const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values());

      // Transform data to include member count and user role
      const groupsWithDetails = await Promise.all(
        uniqueGroups.map(async (group: any) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { data: userMemberData } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            avatar_url: group.avatar_url,
            cover_url: group.cover_url,
            privacy: group.privacy,
            created_by: group.created_by,
            created_at: group.created_at,
            updated_at: group.updated_at,
            member_count: count || 0,
            user_role: userMemberData?.role
          };
        })
      );

      return groupsWithDetails as Group[];
    }
  });

  const createGroup = useMutation({
    mutationFn: async (groupData: {
      name: string;
      description?: string;
      privacy: 'public' | 'private';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          ...groupData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Groupe créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du groupe');
      console.error(error);
    }
  });

  const updateGroup = useMutation({
    mutationFn: async ({ groupId, updates }: {
      groupId: string;
      updates: Partial<Omit<Group, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;
    }) => {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Groupe mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Groupe supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  return {
    groups,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup
  };
};

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(role, user_id)
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;

      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      const userMember = data.group_members.find((m: any) => m.user_id === user.id);

      return {
        ...data,
        member_count: count || 0,
        user_role: userMember?.role
      } as Group;
    },
    enabled: !!groupId
  });
};
