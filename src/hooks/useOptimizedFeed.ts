import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface OptimizedFeedPost {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
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
  media: Array<{
    id: string;
    media_url: string;
    media_type: string;
    order_index: number;
  }>;
  tags: string[];
}

interface FeedResponse {
  data: OptimizedFeedPost[];
  cached: boolean;
  performance?: {
    queryTime: number;
    cacheHit: boolean;
  };
}

interface UseOptimizedFeedOptions {
  userId?: string;
  filterType?: 'recommended' | 'recent' | 'friends';
  pageSize?: number;
  enableRealtime?: boolean;
}

export const useOptimizedFeed = ({
  userId,
  filterType = 'recommended',
  pageSize = 15,
  enableRealtime = true,
}: UseOptimizedFeedOptions = {}) => {
  const queryClient = useQueryClient();
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const prefetchedPages = useRef(new Set<number>());

  // ✅ OPTIMISATION: Fetch posts directement depuis Supabase
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['optimized-feed', userId, filterType],
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`📡 Fetching feed page ${pageParam} (filter: ${filterType})`);
      
      if (!userId) throw new Error('User ID required');

      const startTime = Date.now();
      const offset = pageParam * pageSize;

      // 1. Construire la requête de base
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(username, name, avatar_url),
          post_media(id, media_url, media_type, order_index),
          post_tags(
            id,
            tagged_user_id,
            tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // 2. Appliquer le filtre si nécessaire
      if (filterType === 'friends') {
        const { data: friendships } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        const friendIds = friendships?.map(fr => 
          fr.sender_id === userId ? fr.receiver_id : fr.sender_id
        ) || [];

        if (friendIds.length === 0) {
          return {
            posts: [],
            nextOffset: undefined,
            cached: false,
            performance: { queryTime: Date.now() - startTime, cacheHit: false },
          };
        }

        postsQuery = postsQuery.in('user_id', friendIds);
      }

      const { data: rawPosts, error: postsError } = await postsQuery;

      if (postsError) throw postsError;
      if (!rawPosts) {
        return {
          posts: [],
          nextOffset: undefined,
          cached: false,
          performance: { queryTime: Date.now() - startTime, cacheHit: false },
        };
      }

      // 3. Charger les stats pour tous les posts en batch
      const postIds = rawPosts.map(p => p.id);
      
      const [likesData, commentsData, userLikesData] = await Promise.all([
        supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', userId),
      ]);

      // 4. Agréger les stats par post
      const likesCount = (likesData.data || []).reduce((acc, like) => {
        acc[like.post_id] = (acc[like.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commentsCount = (commentsData.data || []).reduce((acc, comment) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const userLikedSet = new Set((userLikesData.data || []).map(l => l.post_id));

      // 5. Transformer les données
      const posts: OptimizedFeedPost[] = rawPosts.map(post => ({
        id: post.id,
        content: post.content || '',
        media_url: post.media_url,
        media_type: post.media_type,
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
        views_count: 0,
        user_liked: userLikedSet.has(post.id),
        relevance_score: 0,
        engagement_prediction: 0,
        final_score: 0,
        media: post.post_media || [],
        tags: [],
        post_media: post.post_media || [],
        post_tags: post.post_tags || [],
      }));

      const queryTime = Date.now() - startTime;
      console.log(`✅ Fetched ${posts.length} posts (time: ${queryTime}ms)`);

      return {
        posts,
        nextOffset: posts.length === pageSize ? pageParam + 1 : undefined,
        cached: false,
        performance: { queryTime, cacheHit: false },
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Deduplicate posts efficiently using Set
  const allPosts = useMemo(() => {
    if (!data?.pages) return [];
    
    const seenIds = new Set<string>();
    const deduplicated: OptimizedFeedPost[] = [];

    for (const page of data.pages) {
      for (const post of page.posts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          deduplicated.push(post);
        }
      }
    }

    return deduplicated;
  }, [data?.pages]);

  // Prefetch next page (simplifié)
  const prefetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    const nextPageIndex = data?.pages.length || 0;
    if (prefetchedPages.current.has(nextPageIndex)) return;

    console.log(`🔮 Prefetching page ${nextPageIndex}`);
    prefetchedPages.current.add(nextPageIndex);
    
    // Le prefetch utilisera automatiquement la même queryFn
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, data?.pages.length, fetchNextPage]);

  // Setup Realtime subscriptions
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    console.log('🔴 Setting up Realtime subscriptions for feed');

    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          console.log('🆕 New post detected:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['optimized-feed'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        () => {
          console.log('❤️ Like event detected');
          queryClient.invalidateQueries({ queryKey: ['optimized-feed'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        () => {
          console.log('💬 New comment detected');
          queryClient.invalidateQueries({ queryKey: ['optimized-feed'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_shares',
        },
        () => {
          console.log('🔄 New share detected');
          queryClient.invalidateQueries({ queryKey: ['optimized-feed'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🔴 Cleaning up Realtime subscriptions');
      channel.unsubscribe();
    };
  }, [enableRealtime, userId, queryClient]);

  // Invalidate cache on new post creation
  const invalidateFeedCache = useCallback(async () => {
    console.log('🗑️ Invalidating feed cache');
    await queryClient.invalidateQueries({ queryKey: ['optimized-feed'] });
  }, [queryClient]);

  return {
    posts: allPosts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    prefetchNextPage,
    invalidateFeedCache,
  };
};
