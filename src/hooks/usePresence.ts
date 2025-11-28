import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  current_page?: string;
}

interface PresenceState {
  [userId: string]: UserPresence;
}

export const usePresence = (currentUserId?: string) => {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [isOnline, setIsOnline] = useState(true);

  // Update user presence
  const updatePresence = useCallback(async (online: boolean, page?: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: online,
          last_seen: new Date().toISOString(),
          current_page: page || window.location.pathname,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      setIsOnline(online);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user?.id]);

  // Subscribe to presence changes for friends
  useEffect(() => {
    if (!user?.id) return;

    // Get initial presence state for friends
    const fetchFriendsPresence = async () => {
      try {
        // Get user's friends
        const { data: friends } = await supabase
          .from('friend_requests')
          .select(`
            sender_id,
            receiver_id,
            sender:user_presence!friend_requests_sender_id_fkey(
              user_id,
              is_online,
              last_seen,
              current_page
            ),
            receiver:user_presence!friend_requests_receiver_id_fkey(
              user_id,
              is_online,
              last_seen,
              current_page
            )
          `)
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        const presenceMap: PresenceState = {};

        friends?.forEach((req: any) => {
          const friendPresence = req.sender_id === user.id ? req.receiver : req.sender;
          if (friendPresence && friendPresence.user_id) {
            presenceMap[friendPresence.user_id] = friendPresence;
          }
        });

        setPresenceState(presenceMap);
      } catch (error) {
        console.error('Error fetching friends presence:', error);
        // Fallback: simulate presence for demo purposes
        const mockPresence: PresenceState = {};
        // This will be filled by the heartbeat simulation below
        setPresenceState(mockPresence);
      }
    };

    fetchFriendsPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const presence = payload.new as UserPresence;
            setPresenceState(prev => ({
              ...prev,
              [presence.user_id]: presence
            }));
          }
        }
      )
      .subscribe();

    // Set user as online when component mounts
    updatePresence(true);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      updatePresence(!document.hidden);
    };

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat to keep user online and refresh friends presence
    const heartbeat = setInterval(async () => {
      if (!document.hidden) {
        await updatePresence(true, window.location.pathname);

        // Refresh friends presence data from database
        try {
          const { data: friendsPresence } = await supabase
            .from('friend_requests')
            .select(`
              sender_id,
              receiver_id,
              sender_presence:user_presence!friend_requests_sender_id_fkey(
                user_id,
                is_online,
                last_seen,
                current_page
              ),
              receiver_presence:user_presence!friend_requests_receiver_id_fkey(
                user_id,
                is_online,
                last_seen,
                current_page
              )
            `)
            .eq('status', 'accepted')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .limit(20); // Get more friends for better presence data

          if (friendsPresence) {
            const realPresence: PresenceState = {};
            friendsPresence.forEach((req: any) => {
              const friendPresence = req.sender_id === user.id ? req.receiver_presence : req.sender_presence;
              if (friendPresence?.user_id) {
                realPresence[friendPresence.user_id] = {
                  user_id: friendPresence.user_id,
                  is_online: friendPresence.is_online || false,
                  last_seen: friendPresence.last_seen || new Date().toISOString(),
                  current_page: friendPresence.current_page || null
                };
              }
            });
            setPresenceState(realPresence);
          }
        } catch (error) {
          console.error('Error refreshing friends presence:', error);
          // Fallback to empty state if error
          setPresenceState({});
        }
      }
    }, 15000); // Every 15 seconds for more responsive presence

    return () => {
      channel.unsubscribe();
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set offline when component unmounts
      updatePresence(false);
    };
  }, [user?.id, updatePresence]);

  // Get presence info for a specific user
  const getUserPresence = useCallback((userId: string): UserPresence | null => {
    return presenceState[userId] || null;
  }, [presenceState]);

  // Check if user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    const presence = presenceState[userId];
    return presence?.is_online || false;
  }, [presenceState]);

  // Get last seen time
  const getLastSeen = useCallback((userId: string): string | null => {
    const presence = presenceState[userId];
    return presence?.last_seen || null;
  }, [presenceState]);

  return {
    presenceState,
    isOnline,
    updatePresence,
    getUserPresence,
    isUserOnline,
    getLastSeen
  };
};
