import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

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
    queryKey: ['smart-feed', userId, filterType],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { posts: [], nextOffset: null };

      const { data: rawPosts, error } = await supabase.rpc('get_smart_feed', {
        user_id_param: userId,
        filter_type: filterType,
        limit_param: 15,
        offset_param: pageParam
      });

      if (error) throw error;

      const uniquePosts = (rawPosts || []).reduce((acc: SmartFeedPost[], post: SmartFeedPost) => {
        if (!acc.find(p => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, []);

      // Charger les médias pour tous les posts en une seule requête
      if (uniquePosts.length > 0) {
        const postIds = uniquePosts.map(p => p.id);
        
        const { data: mediaData } = await supabase
          .from('post_media')
          .select('*')
          .in('post_id', postIds)
          .order('order_index');

        const { data: tagsData } = await supabase
          .from('post_tags')
          .select(`
            *,
            tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
          `)
          .in('post_id', postIds);

        // Grouper les médias par post_id
        const mediaByPost = (mediaData || []).reduce((acc: any, media: any) => {
          if (!acc[media.post_id]) acc[media.post_id] = [];
          acc[media.post_id].push(media);
          return acc;
        }, {});

        // Grouper les tags par post_id
        const tagsByPost = (tagsData || []).reduce((acc: any, tag: any) => {
          if (!acc[tag.post_id]) acc[tag.post_id] = [];
          acc[tag.post_id].push(tag);
          return acc;
        }, {});

        // Enrichir les posts avec les médias et tags
        uniquePosts.forEach((post: any) => {
          post.post_media = mediaByPost[post.id] || [];
          post.post_tags = tagsByPost[post.id] || [];
        });
      }

      return {
        posts: uniquePosts as SmartFeedPost[],
        nextOffset: uniquePosts.length === 15 ? pageParam + 15 : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes pour voir les nouveaux posts plus rapidement
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1
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

  // Deduplicate posts across all pages
  const allPosts = data?.pages.flatMap(page => page.posts) || [];
  const posts = allPosts.reduce((acc: SmartFeedPost[], post: SmartFeedPost) => {
    if (!acc.find(p => p.id === post.id)) {
      acc.push(post);
    }
    return acc;
  }, []);

  return {
    posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    trackPostView,
    trackPostClick,
    trackTimeSpent,
    recordSignal: recordSignal.mutate,
    error
  };
};