import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPresence {
  user_id: string;
  online: boolean;
  last_seen: string;
  updated_at: string;
  // Extensions pour notre logique
  status?: 'online' | 'away' | 'offline';
  is_typing?: boolean;
  current_conversation?: string;
}

interface PresenceState {
  [userId: string]: UserPresence;
}

export const usePresenceSystem = () => {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // MISE À JOUR DU STATUT UTILISATEUR
  const updatePresence = useCallback(async (
    status: 'online' | 'away' | 'offline',
    metadata?: { is_typing?: boolean; current_conversation?: string }
  ) => {
    if (!user?.id) return;

    try {
      const presenceData = {
        user_id: user.id,
        status,
        last_seen: new Date().toISOString(),
        ...metadata
      };

      // Mise à jour en base
      const { error } = await supabase
        .from('user_presence')
        .upsert(presenceData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Broadcast via Realtime
      await supabase.channel('presence_updates').send({
        type: 'broadcast',
        event: 'presence_update',
        payload: presenceData
      });

      console.log('✅ Presence updated:', status, metadata);

    } catch (error) {
      console.error('❌ Presence update error:', error);
    }
  }, [user?.id]);

  // HEARTBEAT POUR RESTER "ONLINE"
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      // Si inactif > 5 minutes → away
      // Si inactif > 15 minutes → offline
      if (timeSinceActivity > 15 * 60 * 1000) {
        await updatePresence('offline');
      } else if (timeSinceActivity > 5 * 60 * 1000) {
        await updatePresence('away');
      } else {
        await updatePresence('online');
      }
    }, 30000); // Toutes les 30 secondes
  }, [updatePresence]);

  // DÉTECTION D'ACTIVITÉ UTILISATEUR
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Remettre online immédiatement si on était away
    const currentPresence = presenceState[user?.id!];
    if (currentPresence?.status === 'away') {
      updatePresence('online');
    }
  }, [user?.id, presenceState, updatePresence]);

  // GESTION TYPING INDICATOR
  const startTyping = useCallback(async (conversationId: string) => {
    await updatePresence('online', {
      is_typing: true,
      current_conversation: conversationId
    });

    // Auto-stop après 3 secondes si pas de message envoyé
    setTimeout(async () => {
      await updatePresence('online', {
        is_typing: false,
        current_conversation: undefined
      });
    }, 3000);
  }, [updatePresence]);

  const stopTyping = useCallback(async () => {
    await updatePresence('online', {
      is_typing: false,
      current_conversation: undefined
    });
  }, [updatePresence]);

  // SUBSCRIPTION AUX STATUTS DES AUTRES UTILISATEURS
  useEffect(() => {
    if (!user?.id) return;

    // Récupération des statuts initiaux
    const fetchInitialPresence = async () => {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .neq('user_id', user.id) // Exclure soi-même
        .order('last_seen', { ascending: false });

      if (!error && data) {
        const presenceMap: PresenceState = {};
        data.forEach(presence => {
          presenceMap[presence.user_id] = presence;
        });
        setPresenceState(presenceMap);
      }
    };

    fetchInitialPresence();

    // Subscription temps réel
    const presenceChannel = supabase
      .channel('presence_updates')
      .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
        setPresenceState(prev => ({
          ...prev,
          [payload.user_id]: payload
        }));
      })
      .subscribe();

    // Démarrer heartbeat
    startHeartbeat();

    // Événements d'activité
    const handleActivity = () => recordActivity();

    // Mouse/Touch events
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    document.addEventListener('scroll', handleActivity);

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      presenceChannel.unsubscribe();

      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('scroll', handleActivity);

      // Marquer offline à la déconnexion
      updatePresence('offline');
    };
  }, [user?.id, startHeartbeat, recordActivity, updatePresence]);

  // FONCTIONS UTILITAIRES
  const getUserStatus = useCallback((userId: string): UserPresence | null => {
    return presenceState[userId] || null;
  }, [presenceState]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const presence = presenceState[userId];
    if (!presence) return false;

    // Considérer online si dernière activité < 2 minutes
    const lastSeen = new Date(presence.last_seen).getTime();
    const now = Date.now();
    return presence.status === 'online' && (now - lastSeen) < 2 * 60 * 1000;
  }, [presenceState]);

  const isUserAway = useCallback((userId: string): boolean => {
    const presence = presenceState[userId];
    return presence?.status === 'away' || false;
  }, [presenceState]);

  const isUserTyping = useCallback((userId: string, conversationId?: string): boolean => {
    const presence = presenceState[userId];
    return presence?.is_typing &&
           (!conversationId || presence.current_conversation === conversationId) || false;
  }, [presenceState]);

  const getLastSeenText = useCallback((userId: string): string => {
    const presence = presenceState[userId];
    if (!presence) return 'Jamais vu';

    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return lastSeen.toLocaleDateString();
  }, [presenceState]);

  return {
    // État
    presenceState,

    // Actions utilisateur
    updatePresence,
    startTyping,
    stopTyping,
    recordActivity,

    // Getters
    getUserStatus,
    isUserOnline,
    isUserAway,
    isUserTyping,
    getLastSeenText,

    // Métriques
    totalOnline: Object.values(presenceState).filter(p => isUserOnline(p.user_id)).length,
    totalAway: Object.values(presenceState).filter(p => isUserAway(p.user_id)).length
  };
};
