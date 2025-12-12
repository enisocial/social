// @deno-types="https://esm.sh/@supabase/supabase-js@2.81.1/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';
import { redis } from '../_shared/redis.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { filterType = 'recommended', pageSize = 10, offset = 0 } = await req.json();

    const url = new URL(req.url);
    const bustCache = url.searchParams.get('bustCache') === 'true';

    const cacheKey = `feed:v2:${user.id}:${filterType}:${pageSize}:${offset}`;
    const cacheTTL = 120; // 2 minutes pour le feed

    // Bust cache if requested
    if (bustCache) {
      try {
        await redis.del(cacheKey);
        console.log('🗑️ Cache busted for', cacheKey);
      } catch (redisError) {
        console.log('⚠️ Redis unavailable for cache busting');
      }
    }

    // Try to get from cache first
    let cachedData = null;
    try {
      cachedData = await redis.get(cacheKey) as any;
    } catch (redisError) {
      console.log('⚠️ Redis unavailable, proceeding without cache');
    }

    if (cachedData && !bustCache) {
      const elapsed = performance.now() - startTime;
      console.log(`✅ Feed CACHE HIT for ${cacheKey} (${elapsed.toFixed(2)}ms)`);

      return new Response(
        JSON.stringify({
          ...cachedData,
          cached: true,
          performance: { queryTime: elapsed, cacheHit: true }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          }
        }
      );
    }

    console.log(`⏳ Feed CACHE MISS for ${cacheKey} - fetching from DB`);

    // Build query based on filter type
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
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (filterType === 'friends') {
      const { data: friendships } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const friendIds = friendships?.map((fr: { sender_id: string; receiver_id: string }) =>
        fr.sender_id === user.id ? fr.receiver_id : fr.sender_id
      ).filter((id: string) => id !== user.id) || [];

      if (friendIds.length > 0) {
        postsQuery = postsQuery.in('user_id', friendIds);
      }
    }

    const { data: rawPosts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('❌ Posts query error:', postsError);
      throw postsError;
    }

    if (!rawPosts || rawPosts.length === 0) {
      const responseData = { posts: [], nextOffset: null };
      return new Response(
        JSON.stringify({
          ...responseData,
          cached: false,
          performance: { queryTime: performance.now() - startTime, cacheHit: false }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      );
    }

    // Get likes and comments counts efficiently
    const postIds = rawPosts.map((p: { id: string }) => p.id);

    const [likesData, commentsData, userLikesData] = await Promise.all([
      supabase.from('likes').select('post_id', { count: 'exact' }).in('post_id', postIds),
      supabase.from('comments').select('post_id', { count: 'exact' }).in('post_id', postIds),
      supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', user.id)
    ]);

    // Process statistics
    const likesCount: Record<string, number> = {};
    const commentsCount: Record<string, number> = {};
    const userLikedSet = new Set<string>();

    likesData.data?.forEach((like: { post_id: string }) => {
      likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
    });

    commentsData.data?.forEach((comment: { post_id: string }) => {
      commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
    });

    userLikesData.data?.forEach((like: { post_id: string }) => userLikedSet.add(like.post_id));

    // Transform posts
    const posts = rawPosts.map((post: any) => ({
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
      post_media: post.post_media || [],
      post_tags: post.post_tags || []
    }));

    const elapsed = performance.now() - startTime;
    console.log(`✅ Feed DB query completed in ${elapsed.toFixed(2)}ms, storing in cache`);

    const responseData = {
      posts,
      nextOffset: posts.length === pageSize ? offset + pageSize : null
    };

    // Store in cache (non-blocking)
    try {
      redis.set(cacheKey, responseData, cacheTTL).catch(err =>
        console.error('Failed to cache feed:', err)
      );
    } catch (redisError) {
      console.log('⚠️ Redis unavailable, skipping cache storage');
    }

    return new Response(
      JSON.stringify({
        ...responseData,
        cached: false,
        performance: { queryTime: elapsed, cacheHit: false }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Query-Time': `${elapsed.toFixed(2)}ms`,
        }
      }
    );
  } catch (error) {
    const elapsed = performance.now() - startTime;
    console.error('❌ Feed error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { queryTime: elapsed }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
