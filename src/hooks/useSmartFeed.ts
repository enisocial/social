import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useMemo } from 'react';

interface SmartFeedPost {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  privacy: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  user_liked: boolean;
  relevance_score: number;
  engagement_prediction: number;
  final_score: number;
  post_media?: Array<{
    id: string;
    media_url: string;
    media_type: string;
    order_index: number;
  }>;
  post_tags?: Array<{
    id: string;
    tagged_user_id: string;
    tagged_user: {
      id: string;
      name: string;
      username: string;
      avatar_url: string | null;
    };
  }>;
  link_preview?: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
  feeling?: string;
  location?: string;
  background_color?: string;
}

export const useSmartFeed = (userId: string | undefined, filterType: 'recommended' | 'recent' | 'friends' = 'recommended') => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    error
  } = useInfiniteQuery({
    queryKey: ['smart-feed-redis', userId, filterType], // Changement de clé pour forcer le refresh
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { posts: [], nextOffset: null };

      const pageSize = 10;
      const offset = pageParam * pageSize;

      console.log(`🚀 FEED LOAD: page ${pageParam}, filter ${filterType}`);

      try {
        // REQUÊTE ULTRA-OPTIMISÉE avec toutes les jointures en une seule requête
        const { data: rawPosts, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, content, created_at, updated_at, user_id, privacy,
            profiles!posts_user_id_fkey(username, name, avatar_url),
            post_media(id, media_url, media_type, order_index),
            post_tags(
              id,
              tagged_user_id,
              tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
            )
          `)
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)
          .limit(pageSize);

        if (postsError) {
          console.error('❌ Posts query error:', postsError);
          return { posts: [], nextOffset: null };
        }

        if (!rawPosts || rawPosts.length === 0) {
          const emptyResult = { posts: [], nextOffset: null };
          return emptyResult;
        }

        // CALCUL ULTRA-RAPIDE des statistiques (parallèle)
        const postIds = rawPosts.map(p => p.id);
        const [likesData, commentsData, userLikesData, viewsData] = await Promise.all([
          supabase.from('likes').select('post_id', { count: 'exact' }).in('post_id', postIds),
          supabase.from('comments').select('post_id', { count: 'exact' }).in('post_id', postIds),
          supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', userId),
          supabase.from('engagement_signals').select('post_id', { count: 'exact' }).in('post_id', postIds).eq('signal_type', 'view')
        ]);

        // TRAITEMENT ULTRA-RAPIDE des statistiques
        const likesCount: Record<string, number> = {};
        const commentsCount: Record<string, number> = {};
        const viewsCount: Record<string, number> = {};
        const userLikedSet = new Set<string>();

        likesData.data?.forEach(like => { likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1; });
        commentsData.data?.forEach(comment => { commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1; });
        viewsData.data?.forEach(view => {
          viewsCount[view.post_id] = (viewsCount[view.post_id] || 0) + 1;
        });
        userLikesData.data?.forEach(like => userLikedSet.add(like.post_id));

        console.log(`📊 FEED STATS: ${postIds.length} posts, views data:`, viewsData.data?.length || 0, 'records');
        console.log('👁️ Views counts:', viewsCount);

        // TRANSFORMATION ULTRA-RAPIDE des données
        const posts: SmartFeedPost[] = rawPosts.map(post => ({
          id: post.id,
          content: post.content || '',
          media_url: null, // Les médias sont maintenant dans post_media
          media_type: null, // Les médias sont maintenant dans post_media
          privacy: post.privacy || 'public',
          created_at: post.created_at,
          updated_at: post.updated_at,
          user_id: post.user_id,
          username: post.profiles?.username || 'unknown',
          name: post.profiles?.name || 'Unknown User',
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: likesCount[post.id] || 0,
          comments_count: commentsCount[post.id] || 0,
          shares_count: 0,
          views_count: viewsCount[post.id] || 0,
          user_liked: userLikedSet.has(post.id),
          relevance_score: 0,
          engagement_prediction: 0,
          final_score: 0,
          post_media: post.post_media || [],
          post_tags: post.post_tags || []
        }));

        const result = {
          posts: posts as SmartFeedPost[],
          nextOffset: posts.length === pageSize ? pageParam + 1 : null
        };

        console.log(`✅ FEED SUCCESS: ${posts.length} posts loaded`);
        return result;

      } catch (err) {
        console.error('🚨 ULTRA FAST FEED FAILED:', err);
        return { posts: [], nextOffset: null };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 secondes pour forcer refresh fréquent
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Désactiver pour éviter les requêtes inutiles
    refetchOnMount: true,
    retry: 1, // Retry minimal pour éviter spam
  });

  // Enregistrer un signal d'engagement
  const recordSignal = useMutation({
    mutationFn: async ({ postId, signalType, signalValue = 1 }: { 
      postId: string; 
      signalType: 'view' | 'like' | 'comment' | 'share' | 'click' | 'time_spent'; 
      signalValue?: number 
    }) => {
      if (!userId) return;
      
      const { error } = await supabase.rpc('record_engagement_signal', {
        p_user_id: userId,
        p_post_id: postId,
        p_signal_type: signalType,
        p_signal_value: signalValue
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider le cache pour recalculer les scores
      queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
    }
  });

  // Helper pour tracker les vues de posts
  const trackPostView = useCallback((postId: string) => {
    recordSignal.mutate({ postId, signalType: 'view' });
  }, [recordSignal]);

  // Helper pour tracker les clics
  const trackPostClick = useCallback((postId: string) => {
    recordSignal.mutate({ postId, signalType: 'click' });
  }, [recordSignal]);

  // Helper pour tracker le temps passé
  const trackTimeSpent = useCallback((postId: string, seconds: number) => {
    if (seconds > 3) { // Seulement si plus de 3 secondes
      recordSignal.mutate({ postId, signalType: 'time_spent', signalValue: seconds });
    }
  }, [recordSignal]);

  // Prefetching simple pour performance
  const prefetchNextPages = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || !userId) return;

    // Prefetch juste la page suivante
    const nextPageIndex = (data?.pages.length || 0);
    if (!prefetchedPages.has(nextPageIndex)) {
      prefetchedPages.add(nextPageIndex);
      // Prefetching activé
      // Le prefetch sera géré automatiquement par React Query
    }
  }, [hasNextPage, isFetchingNextPage, userId, data?.pages.length]);

  // Déclencher prefetching quand on approche de la fin
  useEffect(() => {
    if (data?.pages && data.pages.length > 0) {
      const lastPage = data.pages[data.pages.length - 1];
      if (lastPage.posts.length >= 10) { // Si la page est presque pleine
        prefetchNextPages();
      }
    }
  }, [data?.pages, prefetchNextPages]);

  // Cache local pour éviter les recalculs
  const posts = useMemo(() => {
    if (!data?.pages) return [];

    const seenIds = new Set<string>();
    const deduplicated: SmartFeedPost[] = [];

    // Parcourir en ordre inverse pour garder les plus récents
    for (let i = data.pages.length - 1; i >= 0; i--) {
      const page = data.pages[i];
      for (const post of page.posts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          deduplicated.unshift(post); // Ajouter au début pour garder l'ordre chronologique
        }
      }
    }

    return deduplicated;
  }, [data?.pages]);

  // Fonction pour forcer le rafraîchissement des données de profil
  const refreshProfileData = useCallback(async () => {
    console.log('🔄 Forcing profile data refresh...');

    // Invalider tous les caches liés aux profils
    await queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    await queryClient.invalidateQueries({ queryKey: ['profiles'] });

    // Forcer un refetch immédiat
    await refetch();

    console.log('✅ Profile data refreshed');
  }, [queryClient, refetch]);

  return {
    posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    prefetchNextPages,
    refreshProfileData, // Nouvelle fonction pour rafraîchir les profils
    trackPostView,
    trackPostClick,
    trackTimeSpent,
    recordSignal: recordSignal.mutate,
    error
  };
};

// Variable pour tracker les pages prefetchées
const prefetchedPages = new Set<number>();
