import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useOptimizedFriendRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch sent requests with pagination
  const { data: sentRequests = [], isLoading: sentLoading } = useQuery({
    queryKey: ['friend-requests', 'sent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FriendRequest[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch received requests with pagination
  const { data: receivedRequests = [], isLoading: receivedLoading } = useQuery({
    queryKey: ['friend-requests', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FriendRequest[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch accepted friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FriendRequest[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Send friend request with ultra-fast execution
  const { mutate: sendFriendRequest } = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Ultra-fast: Try to insert directly first (most common case)
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (!error) {
        return 'sent';
      }

      // If insert failed, check what happened (duplicate or other error)
      if (error.code === '23505') {
        // Duplicate key - check existing relationship
        const { data: existing } = await supabase
          .from('friend_requests')
          .select('id, status, sender_id, receiver_id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
          .maybeSingle();

        if (!existing) return 'error';

        if (existing.status === 'accepted') return 'already_friends';
        if (existing.status === 'pending') {
          if (existing.sender_id === user.id) return 'already_sent';
          if (existing.sender_id === receiverId) {
            // They sent us a request - auto-accept
            await supabase
              .from('friend_requests')
              .update({ status: 'accepted' })
              .eq('id', existing.id);
            return 'accepted';
          }
        }

        // If rejected/cancelled, allow resending
        if (existing.sender_id === user.id) {
          await supabase
            .from('friend_requests')
            .update({ status: 'pending' })
            .eq('id', existing.id);
          return 'sent';
        }
      }

      throw error;
    },
    onSuccess: (result) => {
      // Ultra-fast cache updates
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });

      // Immediate UI feedback
      if (result === 'accepted') {
        toast.success('Vous êtes maintenant amis !');
      } else if (result === 'already_friends') {
        toast.info('Vous êtes déjà amis');
      } else if (result === 'already_sent') {
        toast.info('Demande déjà envoyée');
      } else {
        toast.success('Demande envoyée');
      }
    },
    // Optimistic updates for instant UI feedback
    onMutate: async (receiverId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['friend-requests', 'sent', user?.id] });

      // Snapshot previous value
      const previousSent = queryClient.getQueryData(['friend-requests', 'sent', user?.id]);

      // Optimistically update to show pending request
      queryClient.setQueryData(['friend-requests', 'sent', user?.id], (old: any) => {
        if (!old) return old;
        return [...old, {
          id: `temp-${Date.now()}`,
          sender_id: user?.id,
          receiver_id: receiverId,
          status: 'pending',
          created_at: new Date().toISOString(),
          receiver: { id: receiverId, name: 'Loading...', username: 'loading' }
        }];
      });

      return { previousSent };
    },
    onError: (err, receiverId, context) => {
      console.error('Error sending friend request:', err);
      toast.error('Erreur lors de l\'envoi de la demande');

      // Rollback on error
      if (context?.previousSent) {
        queryClient.setQueryData(['friend-requests', 'sent', user?.id], context.previousSent);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    }
  });

  // Accept friend request with optimistic updates
  const { mutate: acceptFriendRequest } = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Demande acceptée');
    },
    onError: (error) => {
      console.error('Error accepting friend request:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  });

  // Reject friend request
  const { mutate: rejectFriendRequest } = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success('Demande refusée');
    },
    onError: (error) => {
      console.error('Error rejecting friend request:', error);
      toast.error('Erreur lors du refus');
    }
  });

  // Cancel friend request
  const { mutate: cancelFriendRequest } = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', 'sent'] });
      toast.success('Demande annulée');
    },
    onError: (error) => {
      console.error('Error canceling friend request:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  });

  // Remove friend
  const { mutate: removeFriend } = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Ami retiré');
    },
    onError: (error) => {
      console.error('Error removing friend:', error);
      toast.error('Erreur lors du retrait');
    }
  });

  // Get friendship status
  const getFriendshipStatus = (targetUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
    if (!user?.id) return 'none';

    // Check if friends
    const isFriend = friends.some(
      fr => (fr.sender_id === user.id && fr.receiver_id === targetUserId) ||
            (fr.receiver_id === user.id && fr.sender_id === targetUserId)
    );
    if (isFriend) return 'friends';

    // Check sent requests
    const hasSentRequest = sentRequests.some(fr => fr.receiver_id === targetUserId);
    if (hasSentRequest) return 'pending_sent';

    // Check received requests
    const hasReceivedRequest = receivedRequests.some(fr => fr.sender_id === targetUserId);
    if (hasReceivedRequest) return 'pending_received';

    return 'none';
  };

  return {
    sentRequests,
    receivedRequests,
    friends,
    loading: sentLoading || receivedLoading || friendsLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendshipStatus,
  };
};
