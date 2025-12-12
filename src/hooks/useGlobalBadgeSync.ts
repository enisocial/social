import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface BadgeState {
  messages: number;
  notifications: number;
  friendRequests: number;
  total: number;
  lastUpdate: number;
  // Cache des conversations pour éviter les recalculs
  conversationCache: Map<string, number>;
}

export const useGlobalBadgeSync = () => {
  const { user } = useAuth();
  const [badgeState, setBadgeState] = useState<BadgeState>({
    messages: 0,
    notifications: 0,
    friendRequests: 0,
    total: 0,
    lastUpdate: Date.now(),
    conversationCache: new Map()
  });

  // Ref pour éviter les appels simultanés
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  // FONCTION PRINCIPALE DE SYNCHRONISATION
  const refreshBadges = useCallback(async (force = false) => {
    if (!user?.id) return;

    const now = Date.now();
    // Anti-spam : max 1 refresh par seconde sauf si forcé
    if (!force && now - lastRefreshRef.current < 1000) return;
    if (isRefreshingRef.current && !force) return;

    isRefreshingRef.current = true;
    lastRefreshRef.current = now;

    try {
      console.log('🔄 [GLOBAL] Synchronisation badges...');

      // 1. COMPTER LES MESSAGES NON LUS (optimisé avec cache)
      let totalMessages = 0;
      const conversationCache = new Map(badgeState.conversationCache);

      // Récupérer les conversations de l'utilisateur
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (conversations) {
        // Batch processing pour éviter les appels individuels
        const conversationIds = conversations.map(c => c.conversation_id);

        // Une seule requête pour compter tous les messages non lus
        const { data: unreadCounts } = await supabase
          .from('messages')
          .select('conversation_id, read')
          .in('conversation_id', conversationIds)
          .eq('read', false)
          .neq('sender_id', user.id);

        // Grouper par conversation
        const countsByConv = new Map<string, number>();
        unreadCounts?.forEach(msg => {
          countsByConv.set(msg.conversation_id, (countsByConv.get(msg.conversation_id) || 0) + 1);
        });

        // Calculer le total
        totalMessages = Array.from(countsByConv.values()).reduce((sum, count) => sum + count, 0);

        // Mettre à jour le cache
        countsByConv.forEach((count, convId) => {
          conversationCache.set(convId, count);
        });
      }

      // 2. COMPTER LES NOTIFICATIONS
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // 3. COMPTER LES DEMANDES D'AMIS
      const { count: friendRequestsCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      // 4. MISE À JOUR ÉTAT GLOBAL
      const newState = {
        messages: totalMessages,
        notifications: notificationsCount || 0,
        friendRequests: friendRequestsCount || 0,
        total: totalMessages + (notificationsCount || 0) + (friendRequestsCount || 0),
        lastUpdate: now,
        conversationCache
      };

      console.log('✅ [GLOBAL] Badges synchronisés:', newState);
      setBadgeState(newState);

      // 5. METTRE À JOUR LE CACHE LOCAL POUR PERSISTANCE
      localStorage.setItem(`badges_${user.id}`, JSON.stringify({
        ...newState,
        lastUpdate: now
      }));

    } catch (error) {
      console.error('❌ [GLOBAL] Erreur synchronisation badges:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [user?.id, badgeState.conversationCache]);

  // INITIALISATION ET SYNCHRONISATION TEMPS RÉEL
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 [GLOBAL] Initialisation système badges');

    // 1. RESTAURER LE CACHE LOCAL
    const cachedBadges = localStorage.getItem(`badges_${user.id}`);
    if (cachedBadges) {
      try {
        const parsed = JSON.parse(cachedBadges);
        // Vérifier si le cache n'est pas trop vieux (max 5 minutes)
        if (Date.now() - parsed.lastUpdate < 5 * 60 * 1000) {
          setBadgeState(prev => ({ ...prev, ...parsed }));
          console.log('📦 [GLOBAL] Cache local restauré');
        }
      } catch (error) {
        console.warn('⚠️ [GLOBAL] Erreur restauration cache:', error);
      }
    }

    // 2. SYNCHRONISATION INITIALE
    refreshBadges(true);

    // 3. POLLING OPTIMISÉ (toutes les 30 secondes en arrière-plan)
    const pollInterval = setInterval(() => {
      refreshBadges();
    }, 30000);

    // 4. WEBSOCKET POUR TEMPS RÉEL
    const realtimeChannel = supabase
      .channel('global_badges_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('📨 [GLOBAL] Nouveau message détecté');
        // Debounce pour éviter les appels simultanés
        setTimeout(() => refreshBadges(), 500);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('🔔 [GLOBAL] Nouvelle notification détectée');
        setTimeout(() => refreshBadges(), 500);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests'
      }, (payload) => {
        console.log('👥 [GLOBAL] Nouvelle demande d\'ami détectée');
        setTimeout(() => refreshBadges(), 500);
      })
      .subscribe();

    // 5. FOCUS/VISIBILITY API pour synchronisation intelligente
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ [GLOBAL] Page visible - synchronisation');
        refreshBadges(true); // Force refresh quand l'utilisateur revient
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 6. WINDOW FOCUS pour multi-appareils
    const handleFocus = () => {
      console.log('🎯 [GLOBAL] Fenêtre active - vérification badges');
      refreshBadges();
    };

    window.addEventListener('focus', handleFocus);

    // CLEANUP
    return () => {
      clearInterval(pollInterval);
      realtimeChannel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, refreshBadges]);

  // FONCTIONS UTILITAIRES
  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Marquer tous les messages de cette conversation comme lus
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      // Mettre à jour le cache local immédiatement
      setBadgeState(prev => {
        const newCache = new Map(prev.conversationCache);
        newCache.set(conversationId, 0);

        const newMessages = Array.from(newCache.values()).reduce((sum, count) => sum + count, 0);

        return {
          ...prev,
          messages: newMessages,
          total: newMessages + prev.notifications + prev.friendRequests,
          conversationCache: newCache,
          lastUpdate: Date.now()
        };
      });

      console.log('✅ [GLOBAL] Conversation marquée comme lue:', conversationId);

    } catch (error) {
      console.error('❌ [GLOBAL] Erreur marquage conversation lue:', error);
    }
  }, [user?.id]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      // Mettre à jour le compteur immédiatement
      setBadgeState(prev => ({
        ...prev,
        notifications: Math.max(0, prev.notifications - 1),
        total: Math.max(0, prev.total - 1),
        lastUpdate: Date.now()
      }));

    } catch (error) {
      console.error('❌ [GLOBAL] Erreur marquage notification lue:', error);
    }
  }, []);

  const forceRefresh = useCallback(() => {
    refreshBadges(true);
  }, [refreshBadges]);

  return {
    ...badgeState,
    markConversationRead,
    markNotificationRead,
    forceRefresh,
    isOnline: true // TODO: Implémenter la détection de statut en ligne
  };
};
