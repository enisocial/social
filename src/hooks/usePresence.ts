import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePresence = (userId?: string) => {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const offlineTimeoutRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);
  const currentUserIdRef = useRef<string | undefined>(userId);

  useEffect(() => {
    if (!userId) return;
    isActiveRef.current = true;
    currentUserIdRef.current = userId;

    // Set user online when component mounts
    const setOnline = async () => {
      if (!isActiveRef.current) return;
      try {
        await supabase.rpc('update_user_presence', {
          p_user_id: userId,
          p_online: true
        });
      } catch (error) {
        console.error('Error setting online status:', error);
      }
    };

    // Set user offline when component unmounts or page unloads
    const setOffline = async () => {
      if (!currentUserIdRef.current) return;
      try {
        await supabase.rpc('update_user_presence', {
          p_user_id: currentUserIdRef.current,
          p_online: false
        });
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    };

    // Initial online status
    setOnline();

    // Update presence on visibility change with immediate response
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When tab is hidden, set offline after 5 seconds
        offlineTimeoutRef.current = setTimeout(() => {
          setOffline();
        }, 5000);
      } else {
        // When tab becomes visible again, cancel offline and set online immediately
        if (offlineTimeoutRef.current) {
          clearTimeout(offlineTimeoutRef.current);
        }
        setOnline();
      }
    };

    // Set offline immediately on page unload using sendBeacon for reliability
    const handleBeforeUnload = () => {
      if (!currentUserIdRef.current) return;
      // Use sendBeacon for more reliable offline detection
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_user_presence`,
        JSON.stringify({ p_user_id: currentUserIdRef.current, p_online: false })
      );
    };

    // Heartbeat every 10 seconds to keep connection alive (more frequent)
    heartbeatIntervalRef.current = setInterval(async () => {
      if (!document.hidden && isActiveRef.current) {
        // Verify user is still authenticated before updating presence
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === currentUserIdRef.current) {
          setOnline();
        } else {
          // Session expired or user logged out, stop heartbeat
          isActiveRef.current = false;
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
        }
      }
    }, 10000);

    // Check online status more frequently
    const onlineCheckInterval = setInterval(async () => {
      if (navigator.onLine && !document.hidden && isActiveRef.current) {
        // Verify user is still authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === currentUserIdRef.current) {
          setOnline();
        } else {
          isActiveRef.current = false;
        }
      } else if (!navigator.onLine) {
        setOffline();
      }
    }, 5000);

    // Listen to online/offline events
    const handleOnline = () => setOnline();
    const handleOffline = () => setOffline();

    // Listen to auth state changes to immediately set offline on sign out
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && currentUserIdRef.current) {
        // Immediately stop all intervals and set offline
        isActiveRef.current = false;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = undefined;
        }
        if (offlineTimeoutRef.current) {
          clearTimeout(offlineTimeoutRef.current);
          offlineTimeoutRef.current = undefined;
        }
        // Force offline status update
        supabase.rpc('update_user_presence', {
          p_user_id: currentUserIdRef.current,
          p_online: false
        }).then(() => {
          console.log('User set offline on sign out');
        });
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      const currentUserId = currentUserIdRef.current;
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = undefined;
      }
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = undefined;
      }
      clearInterval(onlineCheckInterval);
      authSubscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Force offline on cleanup
      if (currentUserId) {
        supabase.rpc('update_user_presence', {
          p_user_id: currentUserId,
          p_online: false
        }).then(() => {
          console.log('User set offline on cleanup');
        });
      }
    };
  }, [userId]);
};
