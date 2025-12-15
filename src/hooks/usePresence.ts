// Hook de présence pour vérifier le statut des autres utilisateurs
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Cache pour éviter les requêtes répétées
const presenceCache = new Map<string, { isOnline: boolean; lastSeen: string | null; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 secondes

export const usePresence = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [presenceState, setPresenceState] = useState<Record<string, boolean>>({});

  // Mise à jour de présence très basique
  const updatePresence = useCallback(async (online: boolean) => {
    if (!user?.id) return;
    try {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: online,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsOnline(online);
    } catch (error) {
      // Silent error
    }
  }, [user?.id]);

  // Vérifier si un utilisateur est en ligne (avec cache)
  const isUserOnline = useCallback((userId: string): boolean => {
    if (!userId) return false;

    const cached = presenceCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.isOnline;
    }

    // Si pas en cache, faire une requête rapide
    // Note: Cette fonction doit être synchrone, donc on retourne false par défaut
    // et on met à jour le cache de manière asynchrone
    const fetchPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('is_online, last_seen')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const presence = data as any;
          presenceCache.set(userId, {
            isOnline: presence.is_online || false,
            lastSeen: presence.last_seen || null,
            timestamp: Date.now()
          });

          // Mettre à jour l'état local pour déclencher un re-render
          setPresenceState(prev => ({ ...prev, [userId]: presence.is_online || false }));
        } else {
          // En cas d'erreur, considérer comme hors ligne
          presenceCache.set(userId, {
            isOnline: false,
            lastSeen: null,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        // En cas d'erreur, considérer comme hors ligne
        presenceCache.set(userId, {
          isOnline: false,
          lastSeen: null,
          timestamp: Date.now()
        });
      }
    };

    fetchPresence();

    // Retourner la valeur en cache ou false par défaut
    return cached?.isOnline || false;
  }, []);

  // Obtenir la dernière connexion d'un utilisateur
  const getLastSeen = useCallback((userId: string): string | null => {
    if (!userId) return null;

    const cached = presenceCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.lastSeen;
    }

    // Même logique que isUserOnline
    const fetchPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('is_online, last_seen')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const presence = data as any;
          presenceCache.set(userId, {
            isOnline: presence.is_online || false,
            lastSeen: presence.last_seen || null,
            timestamp: Date.now()
          });
        } else {
          presenceCache.set(userId, {
            isOnline: false,
            lastSeen: null,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        presenceCache.set(userId, {
          isOnline: false,
          lastSeen: null,
          timestamp: Date.now()
        });
      }
    };

    fetchPresence();

    return cached?.lastSeen || null;
  }, []);

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [userId, data] of presenceCache.entries()) {
        if (now - data.timestamp > CACHE_DURATION) {
          presenceCache.delete(userId);
        }
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    updatePresence,
    isUserOnline,
    getLastSeen,
    presenceState
  };
};
