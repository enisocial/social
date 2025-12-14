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

  // Update user presence using direct database call (bypasses RLS issues)
  const updatePresence = useCallback(async (online: boolean, page?: string) => {
    if (!user?.id) return;

    try {
      console.log('🔄 Updating presence:', { user_id: user.id, online });

      // Use direct upsert which should work with the SECURITY DEFINER policy
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: online,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Error updating presence:', error);
        throw error;
      }

      console.log('✅ Presence updated successfully');
      setIsOnline(online);
    } catch (error) {
      console.error('💥 Exception updating presence:', error);
    }
  }, [user?.id]);

  // Subscribe to presence changes for friends
  useEffect(() => {
    if (!user?.id) return;

    // FORCE CLEANUP: Clean up stale presence records on component mount
    const forceCleanup = async () => {
      try {
        console.log('🧹 Force cleanup of stale presence records...');
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // Clean up all stale records (including potential stuck users like "toti koue yvan")
        const { error: cleanupError } = await supabase
          .from('user_presence')
          .update({
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .lt('updated_at', fiveMinutesAgo)
          .eq('is_online', true);

        if (cleanupError) {
          console.error('❌ Cleanup error:', cleanupError);
        } else {
          console.log('✅ Stale presence records cleaned up');
        }
      } catch (error) {
        console.error('💥 Exception during cleanup:', error);
      }
    };

    // Get initial presence state for friends and current user
    const fetchFriendsPresence = async () => {
      try {
        // First, force cleanup
        await forceCleanup();

        // Get user's friends first
        const { data: friends } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .limit(50);

        const friendIds = new Set<string>();
        friends?.forEach((req: any) => {
          if (req.sender_id !== user.id) friendIds.add(req.sender_id);
          if (req.receiver_id !== user.id) friendIds.add(req.receiver_id);
        });

        // Get presence for friends and current user
        const allUserIds = [user.id, ...Array.from(friendIds)];
        const { data: presenceData } = await supabase
          .from('user_presence')
          .select('user_id, is_online, last_seen')
          .in('user_id', allUserIds);

        const presenceMap: PresenceState = {};

        // Initialize all friends as offline by default
        allUserIds.forEach(userId => {
          presenceMap[userId] = {
            user_id: userId,
            is_online: false,
            last_seen: null
          };
        });

        // Update with actual presence data if it exists
        presenceData?.forEach((presence: any) => {
          presenceMap[presence.user_id] = presence;
        });

        console.log('📊 Initial presence state loaded:', presenceMap);
        setPresenceState(presenceMap);
      } catch (error) {
        console.error('Error fetching friends presence:', error);
        // Fallback: empty state
        setPresenceState({});
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
            const presence = payload.new;
            if (presence && typeof presence === 'object' && 'user_id' in presence && 'is_online' in presence) {
              setPresenceState(prev => ({
                ...prev,
                [presence.user_id]: presence as UserPresence
              }));
            }
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

    // Simplified heartbeat - just keep user online, cleanup is handled by database triggers
    const heartbeat = setInterval(async () => {
      if (!document.hidden) {
        await updatePresence(true);
      }
    }, 30000); // Every 30 seconds - less frequent, more reliable

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
