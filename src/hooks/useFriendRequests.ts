import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: {
    username: string;
    name: string;
    avatar_url: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
  receiver?: {
    username: string;
    name: string;
    avatar_url: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
}

export const useFriendRequests = (userId?: string) => {
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchFriendRequests();
      setupRealtimeSubscription();
    }
  }, [userId]);

  const setupRealtimeSubscription = () => {
    if (!userId) return;

    console.log('[FriendRequests] Setting up realtime subscription for user:', userId);

    // Create two separate channels for sent and received requests
    const sentChannel = supabase
      .channel('friend_requests_sent')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[FriendRequests] Sent request changed:', payload);
          fetchFriendRequests();
        }
      )
      .subscribe();

    const receivedChannel = supabase
      .channel('friend_requests_received')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[FriendRequests] Received request changed:', payload);
          fetchFriendRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sentChannel);
      supabase.removeChannel(receivedChannel);
    };
  };

  const fetchFriendRequests = async () => {
    if (!userId) return;

    try {
      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(
            username,
            name,
            avatar_url,
            city,
            region,
            country
          )
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Fetch received requests
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            username,
            name,
            avatar_url,
            city,
            region,
            country
          )
        `)
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false});

      if (receivedError) throw receivedError;

      // Fetch accepted friends
      const { data: acceptedFriends, error: friendsError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(
            username,
            name,
            avatar_url,
            city,
            region,
            country
          ),
          receiver:profiles!friend_requests_receiver_id_fkey(
            username,
            name,
            avatar_url,
            city,
            region,
            country
          )
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (friendsError) throw friendsError;

      setSentRequests(sent as FriendRequest[] || []);
      setReceivedRequests(received?.filter(r => r.status === 'pending') as FriendRequest[] || []);
      setFriends(acceptedFriends as FriendRequest[] || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string): Promise<boolean> => {
    if (!userId) {
      console.error('[FriendRequests] No user ID');
      return false;
    }

    console.log('[FriendRequests] Sending friend request from', userId, 'to', receiverId);

    // Check if already friends or request exists
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        toast.error('Vous êtes déjà amis');
        return false;
      } else if (existing.status === 'pending') {
        toast.error('Demande déjà envoyée');
        return false;
      }
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        status: 'pending',
      });

    if (error) {
      console.error('[FriendRequests] Error sending request:', error);
      if (error.code === '23505') {
        toast.error('Demande déjà envoyée');
      } else {
        toast.error('Erreur lors de l\'envoi de la demande');
      }
      return false;
    }

    console.log('[FriendRequests] ✅ Friend request sent successfully');
    toast.success('Demande d\'ami envoyée');
    await fetchFriendRequests();
    return true;
  };

  const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
    console.log('[FriendRequests] Accepting request:', requestId);

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('[FriendRequests] Error accepting request:', error);
      toast.error('Erreur lors de l\'acceptation');
      return false;
    }

    console.log('[FriendRequests] ✅ Request accepted');
    toast.success('Demande acceptée');
    await fetchFriendRequests();
    return true;
  };

  const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
    console.log('[FriendRequests] Rejecting request:', requestId);

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('[FriendRequests] Error rejecting request:', error);
      toast.error('Erreur lors du refus');
      return false;
    }

    console.log('[FriendRequests] ✅ Request rejected');
    toast.success('Demande refusée');
    await fetchFriendRequests();
    return true;
  };

  const cancelFriendRequest = async (requestId: string): Promise<boolean> => {
    console.log('[FriendRequests] Cancelling request:', requestId);

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('[FriendRequests] Error cancelling request:', error);
      toast.error('Erreur lors de l\'annulation');
      return false;
    }

    console.log('[FriendRequests] ✅ Request cancelled');
    toast.success('Demande annulée');
    await fetchFriendRequests();
    return true;
  };

  const removeFriend = async (friendId: string): Promise<boolean> => {
    if (!userId) {
      console.error('[FriendRequests] No user ID');
      return false;
    }

    console.log('[FriendRequests] Removing friend:', friendId);

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

    if (error) {
      console.error('[FriendRequests] Error removing friend:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }

    console.log('[FriendRequests] ✅ Friend removed');
    toast.success('Ami retiré');
    await fetchFriendRequests();
    return true;
  };

  const getFriendshipStatus = (targetUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
    if (friends.some(f => 
      (f.sender_id === targetUserId || f.receiver_id === targetUserId)
    )) {
      return 'friends';
    }
    
    if (sentRequests.some(r => r.receiver_id === targetUserId && r.status === 'pending')) {
      return 'pending_sent';
    }
    
    if (receivedRequests.some(r => r.sender_id === targetUserId && r.status === 'pending')) {
      return 'pending_received';
    }
    
    return 'none';
  };

  return {
    sentRequests,
    receivedRequests,
    friends,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendshipStatus,
    refetch: fetchFriendRequests,
  };
};
