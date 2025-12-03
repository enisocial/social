import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PostViewData {
  postId: string;
  viewsCount: number;
  lastViewedAt?: string;
  isViewed?: boolean;
}

interface UsePostViewsReturn {
  viewsData: Record<string, PostViewData>;
  trackView: (postId: string) => Promise<void>;
  refreshViews: (postIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export const usePostViews = (): UsePostViewsReturn => {
  const { user } = useAuth();
  const [viewsData, setViewsData] = useState<Record<string, PostViewData>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Générer un ID de session unique pour les utilisateurs non connectés
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('social_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('social_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Tracker une vue de post
  const trackView = useCallback(async (postId: string): Promise<void> => {
    if (!postId) return;

    try {
      const sessionId = getSessionId();

      // Utiliser localStorage pour compter les vues localement
      const localViewsKey = `post_views_${postId}`;
      const currentLocalViews = parseInt(localStorage.getItem(localViewsKey) || '0', 10);
      const newLocalViews = currentLocalViews + 1;
      localStorage.setItem(localViewsKey, newLocalViews.toString());

      console.log(`👁️ Vue trackée localement pour post ${postId}: ${newLocalViews} vues`);

      // Mise à jour immédiate de l'état local avec les données locales
      setViewsData(prev => ({
        ...prev,
        [postId]: {
          postId,
          viewsCount: newLocalViews,
          lastViewedAt: new Date().toISOString(),
          isViewed: true
        }
      }));

      // TODO: Synchronisation avec DB quand les types seront régénérés
      // Pour l'instant, on utilise seulement les données locales
    } catch (error) {
      console.error('Error in trackView:', error);
    }
  }, [getSessionId]);

  // Rafraîchir les vues pour plusieurs posts (utilise localStorage uniquement)
  const refreshViews = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return;

    setIsLoading(true);
    try {
      // Récupérer les données depuis localStorage uniquement
      const newViewsData: Record<string, PostViewData> = {};

      postIds.forEach(postId => {
        const localViewsKey = `post_views_${postId}`;
        const localViews = parseInt(localStorage.getItem(localViewsKey) || '0', 10);

        if (localViews > 0) {
          newViewsData[postId] = {
            postId,
            viewsCount: localViews,
            lastViewedAt: new Date().toISOString(),
            isViewed: false
          };
        }
      });

      setViewsData(prev => ({ ...prev, ...newViewsData }));
    } catch (error) {
      console.error('Error in refreshViews:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // S'abonner aux changements en temps réel des vues
  useEffect(() => {
    const channel = supabase
      .channel('post_views_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: 'views_count.gt.0'
        },
        (payload) => {
          const post = payload.new;
          if (post.id && post.views_count !== undefined) {
            setViewsData(prev => ({
              ...prev,
              [post.id]: {
                ...prev[post.id],
                viewsCount: post.views_count,
                postId: post.id
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    viewsData,
    trackView,
    refreshViews,
    isLoading
  };
};
