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

  // Send friend request with optimistic updates
  const { mutate: sendFriendRequest } = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // First, check if there is already a request in the other direction (pending)
      // If so, we should ACCEPT it instead of sending a new one (or let the UI handle it, but let's be safe)
      const { data: existingReceived } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', receiverId)
        .eq('receiver_id', user.id)
        .maybeSingle();

      if (existingReceived) {
        if (existingReceived.status === 'pending') {
          // Auto-accept the request
          const { error: acceptError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', existingReceived.id);
          
          if (acceptError) throw acceptError;
          return 'accepted'; // Return a flag
        } else if (existingReceived.status === 'accepted') {
          return 'already_friends';
        }
      }

      // Check if we already sent one
      const { data: existingSent } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .maybeSingle();

      if (existingSent) {
        if (existingSent.status === 'pending') return 'already_sent';
        if (existingSent.status === 'accepted') return 'already_friends';
        // If rejected, we might want to allow resending or not. For now, let's try inserting and let DB decide or update.
        // Actually, RLS usually allows insert. Unique constraint will fail.
        // We should update if it exists but was rejected/cancelled? Or delete and insert?
        // friend_requests has UNIQUE(sender, receiver).
        // If rejected, we probably want to update status to pending.
        const { error: updateError } = await supabase
          .from('friend_requests')
          .update({ status: 'pending' })
          .eq('id', existingSent.id);
        
        if (updateError) throw updateError;
        return 'sent';
      }

      // Insert new request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) {
        // Check for duplicate key error code (Postgres 23505)
        if (error.code === '23505') {
           return 'already_sent';
        }
        throw error;
      }
      return 'sent';
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      
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
    onError: (error: any) => {
      console.error('Error sending friend request:', error);
      toast.error(`Erreur: ${error.message || 'Impossible d\'envoyer la demande'}`);
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
