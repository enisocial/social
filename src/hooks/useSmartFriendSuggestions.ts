import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SmartFriendSuggestion {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  mutual_friends_count: number;
  same_location: boolean;
  is_new_user: boolean;
  interaction_score: number;
  suggestion_score: number;
}

export const useSmartFriendSuggestions = (userId?: string, limit: number = 20) => {
  const queryClient = useQueryClient();
  
  // Optimized: Use React Query for caching and automatic refetching
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-friend-suggestions', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_batch_friend_suggestions', {
        user_id_param: userId,
        limit_param: limit,
        offset_param: 0
      });

      if (error) {
        console.error('Error fetching smart friend suggestions:', error);
        return [];
      }
      
      return (data || []) as SmartFriendSuggestion[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Optimistic hide suggestion
  const { mutate: hideSuggestion } = useMutation({
    mutationFn: async (suggestedUserId: string) => {
      if (!userId) throw new Error('User ID required');
      
      const { error } = await supabase
        .from('hidden_friend_suggestions')
        .insert({
          user_id: userId,
          hidden_user_id: suggestedUserId,
        });

      if (error) throw error;
    },
    onMutate: async (suggestedUserId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['smart-friend-suggestions', userId] });

      // Snapshot previous value
      const previousSuggestions = queryClient.getQueryData<SmartFriendSuggestion[]>(['smart-friend-suggestions', userId, limit]);

      // Optimistically update
      queryClient.setQueryData<SmartFriendSuggestion[]>(
        ['smart-friend-suggestions', userId, limit],
        (old = []) => old.filter(s => s.id !== suggestedUserId)
      );

      return { previousSuggestions };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousSuggestions) {
        queryClient.setQueryData(['smart-friend-suggestions', userId, limit], context.previousSuggestions);
      }
      console.error('Error hiding suggestion:', error);
      toast.error('Erreur lors du masquage');
    },
    onSuccess: () => {
      toast.success('Suggestion masquée');
    },
  });

  // Unhide suggestion
  const { mutate: unhideSuggestion } = useMutation({
    mutationFn: async (suggestedUserId: string) => {
      if (!userId) throw new Error('User ID required');
      
      const { error } = await supabase
        .from('hidden_friend_suggestions')
        .delete()
        .eq('user_id', userId)
        .eq('hidden_user_id', suggestedUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Suggestion restaurée');
      refetch();
    },
    onError: (error) => {
      console.error('Error unhiding suggestion:', error);
      toast.error('Erreur lors de la restauration');
    },
  });

  return {
    suggestions,
    loading: isLoading,
    refetch,
    hideSuggestion,
    unhideSuggestion,
  };
};
