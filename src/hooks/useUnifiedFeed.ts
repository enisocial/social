import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useMemo } from 'react';

interface UnifiedFeedItem {
  id: string;
  type: 'post' | 'voice_post';
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'audio' | null;
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
  listens_count?: number; // Pour les posts vocaux
  user_liked: boolean;
  user_listened?: boolean; // Pour les posts vocaux
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
  // Propriétés spécifiques aux posts vocaux
  audio_url?: string;
  audio_duration?: number;
  waveform_data?: any;
  title?: string;
}

export const useUnifiedFeed = (userId: string | undefined, filterType: 'recommended' | 'recent' | 'friends' = 'recommended') => {
  const queryClient = useQueryClient();

  // Écouter les événements de création et suppression de posts vocaux
  useEffect(() => {
    const handleVoicePostCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
    };

    const handleVoicePostDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('voice-post-created', handleVoicePostCreated);
      window.addEventListener('voice-post-deleted', handleVoicePostDeleted);

      return () => {
        window.removeEventListener('voice-post-created', handleVoicePostCreated);
        window.removeEventListener('voice-post-deleted', handleVoicePostDeleted);
      };
    }
  }, [queryClient]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    error
  } = useInfiniteQuery({
    queryKey: ['unified-feed', userId, filterType],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { items: [], nextOffset: null };

      const pageSize = 10;
      const offset = pageParam * pageSize;

      console.log(`🚀 UNIFIED FEED LOAD: page ${pageParam}, filter ${filterType}`);

      try {
        // Récupérer les posts classiques et vocaux en parallèle
        const [postsResult, voicePostsResult] = await Promise.all([
          // Posts classiques
          supabase
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
            .range(offset, offset + pageSize - 1),

          // Posts vocaux
          (supabase as any)
            .from('voice_posts')
            .select(`
              *,
              profiles!voice_posts_user_id_fkey(username, name, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)
        ]);

        console.log('🔍 RAW QUERY RESULTS:');
        console.log('📝 Posts result:', {
          error: postsResult.error,
          count: postsResult.data?.length || 0,
          data: postsResult.data
        });
        console.log('🎵 Voice posts result:', {
          error: voicePostsResult.error,
          count: voicePostsResult.data?.length || 0,
          data: voicePostsResult.data
        });

        if (postsResult.error) {
          console.error('❌ Posts query error:', postsResult.error);
        }

        if (voicePostsResult.error) {
          console.error('❌ Voice posts query error:', voicePostsResult.error);
        }

        const rawPosts = postsResult.data || [];
        const rawVoicePosts = voicePostsResult.data || [];

        console.log('📊 RAW DATA SUMMARY:');
        console.log(`📝 ${rawPosts.length} posts classiques`);
        console.log(`🎵 ${rawVoicePosts.length} posts vocaux`);

        // Calculer les statistiques pour les posts classiques
        const postIds = rawPosts.map((p: any) => p.id);
        const voicePostIds = rawVoicePosts.map((p: any) => p.id);

        const [postsStats, voicePostsStats] = await Promise.all([
          // Stats pour posts classiques
          postIds.length > 0 ? Promise.all([
            supabase.from('likes').select('post_id', { count: 'exact' }).in('post_id', postIds),
            supabase.from('comments').select('post_id', { count: 'exact' }).in('post_id', postIds),
            supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', userId),
            supabase.from('engagement_signals').select('post_id', { count: 'exact' }).in('post_id', postIds).eq('signal_type', 'view')
          ]) : [null, null, null, null],

          // Stats pour posts vocaux
          voicePostIds.length > 0 ? Promise.all([
            (supabase as any).from('voice_post_likes').select('voice_post_id', { count: 'exact' }).in('voice_post_id', voicePostIds),
            (supabase as any).from('voice_post_comments').select('voice_post_id', { count: 'exact' }).in('voice_post_id', voicePostIds),
            (supabase as any).from('voice_post_listens').select('voice_post_id', { count: 'exact' }).in('voice_post_id', voicePostIds),
            (supabase as any).from('voice_post_likes').select('voice_post_id').in('voice_post_id', voicePostIds).eq('user_id', userId),
            (supabase as any).from('voice_post_listens').select('voice_post_id').in('voice_post_id', voicePostIds).eq('user_id', userId)
          ]) : [null, null, null, null, null]
        ]);

        // Traiter les stats des posts classiques
        const postsLikesCount: Record<string, number> = {};
        const postsCommentsCount: Record<string, number> = {};
        const postsViewsCount: Record<string, number> = {};
        const postsUserLikedSet = new Set<string>();

        if (postsStats && postsStats[0]?.data) {
          postsStats[0].data.forEach((like: any) => { postsLikesCount[like.post_id] = (postsLikesCount[like.post_id] || 0) + 1; });
          postsStats[1].data.forEach((comment: any) => { postsCommentsCount[comment.post_id] = (postsCommentsCount[comment.post_id] || 0) + 1; });
          postsStats[2].data.forEach((view: any) => { postsViewsCount[view.post_id] = (postsViewsCount[view.post_id] || 0) + 1; });
          postsStats[3].data.forEach((like: any) => postsUserLikedSet.add(like.post_id));
        }

        // Traiter les stats des posts vocaux
        const voiceLikesCount: Record<string, number> = {};
        const voiceCommentsCount: Record<string, number> = {};
        const voiceListensCount: Record<string, number> = {};
        const voiceUserLikedSet = new Set<string>();
        const voiceUserListenedSet = new Set<string>();

        if (voicePostsStats && voicePostsStats[0]?.data) {
          voicePostsStats[0].data.forEach((like: any) => { voiceLikesCount[like.voice_post_id] = (voiceLikesCount[like.voice_post_id] || 0) + 1; });
          voicePostsStats[1].data.forEach((comment: any) => { voiceCommentsCount[comment.voice_post_id] = (voiceCommentsCount[comment.voice_post_id] || 0) + 1; });
          voicePostsStats[2].data.forEach((listen: any) => { voiceListensCount[listen.voice_post_id] = (voiceListensCount[listen.voice_post_id] || 0) + 1; });
          voicePostsStats[3].data.forEach((like: any) => voiceUserLikedSet.add(like.voice_post_id));
          voicePostsStats[4].data.forEach((listen: any) => voiceUserListenedSet.add(listen.voice_post_id));
        }

        // Transformer les posts classiques
        const transformedPosts: UnifiedFeedItem[] = rawPosts.map((post: any) => ({
          id: post.id,
          type: 'post' as const,
          content: post.content || '',
          media_url: null,
          media_type: null,
          privacy: post.privacy || 'public',
          created_at: post.created_at,
          updated_at: post.updated_at,
          user_id: post.user_id,
          username: post.profiles?.username || 'unknown',
          name: post.profiles?.name || 'Unknown User',
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: postsLikesCount[post.id] || 0,
          comments_count: postsCommentsCount[post.id] || 0,
          shares_count: 0,
          views_count: postsViewsCount[post.id] || 0,
          user_liked: postsUserLikedSet.has(post.id),
          relevance_score: 0,
          engagement_prediction: 0,
          final_score: 0,
          post_media: post.post_media || [],
          post_tags: post.post_tags || []
        }));

        // Transformer les posts vocaux
        const transformedVoicePosts: UnifiedFeedItem[] = rawVoicePosts.map((post: any) => {
          const transformed = {
            id: post.id,
            type: 'voice_post' as const,
            content: post.title || 'Message vocal',
            media_url: post.audio_url,
            media_type: 'audio' as const,
            privacy: 'public',
            created_at: post.created_at,
            updated_at: post.updated_at,
            user_id: post.user_id,
            username: post.profiles?.username || 'unknown',
            name: post.profiles?.name || 'Unknown User',
            avatar_url: post.profiles?.avatar_url || null,
            likes_count: voiceLikesCount[post.id] || 0,
            comments_count: voiceCommentsCount[post.id] || 0,
            shares_count: 0,
            views_count: 0,
            listens_count: voiceListensCount[post.id] || 0,
            user_liked: voiceUserLikedSet.has(post.id),
            user_listened: voiceUserListenedSet.has(post.id),
            relevance_score: 0,
            engagement_prediction: 0,
            final_score: 0,
            audio_url: post.audio_url,
            audio_duration: post.audio_duration,
            waveform_data: post.waveform_data,
            title: post.title
          };

          console.log('🎵 TRANSFORMED VOICE POST:', {
            id: post.id,
            type: transformed.type,
            title: post.title,
            audio_url: post.audio_url?.substring(0, 50),
            created_at: post.created_at
          });

          return transformed;
        });

        // Combiner et trier par date
        const allItems = [...transformedPosts, ...transformedVoicePosts]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Déterminer correctement s'il y a plus de données
        // Continuer tant qu'au moins une table retourne pageSize éléments
        // S'arrêter seulement quand les deux tables ont moins de pageSize éléments
        const hasMoreData = rawPosts.length >= pageSize || rawVoicePosts.length >= pageSize;

        console.log('📊 PAGINATION DEBUG:', {
          pageParam,
          pageSize,
          rawPostsCount: rawPosts.length,
          rawVoicePostsCount: rawVoicePosts.length,
          totalItemsFetched: rawPosts.length + rawVoicePosts.length,
          allItemsCount: allItems.length,
          hasMoreData,
          nextOffset: hasMoreData ? pageParam + 1 : null,
          postsHasMore: rawPosts.length >= pageSize,
          voicePostsHasMore: rawVoicePosts.length >= pageSize
        });

        const result = {
          items: allItems,
          nextOffset: hasMoreData ? pageParam + 1 : null
        };

        console.log(`✅ UNIFIED FEED SUCCESS: ${result.items.length} items loaded (${transformedPosts.length} posts, ${transformedVoicePosts.length} voice posts)`);

        // Log détaillé des items pour débogage
        result.items.forEach((item, index) => {
          console.log(`📄 Item ${index}:`, {
            id: item.id,
            type: item.type,
            content: item.content?.substring(0, 30),
            created_at: item.created_at,
            user: item.username
          });
        });

        return result;

      } catch (err) {
        console.error('🚨 UNIFIED FEED FAILED:', err);
        // Return empty result instead of throwing to prevent feed crash
        console.warn('⚠️ Returning empty feed due to error');
        return { items: [], nextOffset: null };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Enregistrer un signal d'engagement
  const recordSignal = useMutation({
    mutationFn: async ({ itemId, signalType, signalValue = 1, itemType = 'post' }: {
      itemId: string;
      signalType: 'view' | 'like' | 'comment' | 'share' | 'click' | 'time_spent' | 'listen';
      signalValue?: number;
      itemType?: 'post' | 'voice_post';
    }) => {
      if (!userId) return;

      if (itemType === 'voice_post') {
        // Gestion spéciale pour les posts vocaux
        if (signalType === 'listen') {
          await (supabase as any)
            .from('voice_post_listens')
            .upsert({
              voice_post_id: itemId,
              user_id: userId,
              listen_duration: signalValue
            }, {
              onConflict: 'voice_post_id,user_id'
            });
        } else if (signalType === 'like') {
          // Vérifier si déjà liké
          const { data: existingLike } = await (supabase as any)
            .from('voice_post_likes')
            .select('id')
            .eq('voice_post_id', itemId)
            .eq('user_id', userId)
            .single();

          if (existingLike) {
            await (supabase as any)
              .from('voice_post_likes')
              .delete()
              .eq('voice_post_id', itemId)
              .eq('user_id', userId);
          } else {
            await (supabase as any)
              .from('voice_post_likes')
              .insert({
                voice_post_id: itemId,
                user_id: userId
              });
          }
        }
        // Rafraîchir le cache
        queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
      } else {
        // Posts classiques - utiliser le système existant
        const { error } = await supabase.rpc('record_engagement_signal', {
          p_user_id: userId,
          p_post_id: itemId,
          p_signal_type: signalType,
          p_signal_value: signalValue
        });

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
    }
  });

  // Helpers pour le tracking
  const trackPostView = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    recordSignal.mutate({ itemId, signalType: 'view', itemType });
  }, [recordSignal]);

  const trackPostClick = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    recordSignal.mutate({ itemId, signalType: 'click', itemType });
  }, [recordSignal]);

  const trackTimeSpent = useCallback((itemId: string, seconds: number, itemType: 'post' | 'voice_post' = 'post') => {
    if (seconds > 3) {
      recordSignal.mutate({ itemId, signalType: 'time_spent', signalValue: seconds, itemType });
    }
  }, [recordSignal]);

  const trackListen = useCallback((itemId: string, duration: number, completed: boolean = false) => {
    recordSignal.mutate({
      itemId,
      signalType: 'listen',
      signalValue: duration,
      itemType: 'voice_post'
    });
  }, [recordSignal]);

  // Combiner tous les items
  const items = useMemo(() => {
    if (!data?.pages) return [];

    const seenIds = new Set<string>();
    const deduplicated: UnifiedFeedItem[] = [];

    for (let i = data.pages.length - 1; i >= 0; i--) {
      const page = data.pages[i];
      for (const item of page.items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          deduplicated.unshift(item);
        }
      }
    }

    return deduplicated;
  }, [data?.pages]);

  return {
    items,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    trackPostView,
    trackPostClick,
    trackTimeSpent,
    trackListen,
    recordSignal: recordSignal.mutate,
    error
  };
};
