import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedisCache {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, ttl: number) => Promise<void>;
  del: (key: string) => Promise<void>;
}

class UpstashRedis implements RedisCache {
  private baseUrl: string;
  private token: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    this.token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
    this.enabled = !!(this.baseUrl && this.token);
    
    if (this.enabled) {
      console.log('✅ Redis cache enabled for notifications');
    } else {
      console.log('⚠️ Redis cache disabled - using direct queries');
    }
  }

  async get(key: string): Promise<unknown> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const response = await fetch(`${this.baseUrl}/setex/${key}/${ttl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value as object),
      });
      
      if (!response.ok) {
        console.error('Redis SET failed:', response.status);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(`${this.baseUrl}/del/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }
}

const redis = new UpstashRedis();

Deno.serve(async (req) => {
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

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const bustCache = url.searchParams.get('bustCache') === 'true';
    
    const cacheKey = `notifications:v1:${user.id}:${limit}:${offset}`;
    const cacheTTL = 60; // 1 minute (notifications change frequently)

    // Bust cache if requested
    if (bustCache) {
      await redis.del(cacheKey);
      console.log('🗑️ Cache busted for', cacheKey);
    }

    // Try to get from cache
    const cachedData = await redis.get(cacheKey) as { notifications: unknown[]; unreadCount: number; hasMore: boolean; nextOffset: number | null } | null;
    if (cachedData && !bustCache) {
      const elapsed = performance.now() - startTime;
      console.log(`✅ Cache HIT for ${cacheKey} (${elapsed.toFixed(2)}ms)`);
      
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

    console.log(`⏳ Cache MISS for ${cacheKey} - fetching from DB`);

    // Fetch notifications
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notifError) throw notifError;

    // Fetch unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    // Fetch sender profiles
    const senderIds = [...new Set(
      notifications
        ?.map(n => {
          const meta = n.metadata as Record<string, unknown>;
          const liker = meta?.liker_id as string | undefined;
          const commenter = meta?.commenter_id as string | undefined;
          const follower = meta?.follower_id as string | undefined;
          const sender = meta?.sender_id as string | undefined;
          return liker || commenter || follower || sender;
        })
        .filter(Boolean)
    )] as string[];

    let senderProfiles: { id: string; name: string; username: string; avatar_url: string | null }[] = [];
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .in('id', senderIds);
      
      senderProfiles = profiles || [];
    }

    // Enrich notifications with sender info
    const enrichedNotifications = notifications?.map(notification => {
      const meta = notification.metadata as Record<string, unknown>;
      const postId = meta?.post_id as string | undefined;
      const commentId = meta?.comment_id as string | undefined;
      const preview = meta?.content_preview as string | undefined;
      const actorId = (meta?.liker_id || meta?.commenter_id || meta?.follower_id || meta?.sender_id) as string | undefined;
      return {
        ...notification,
        post_id: postId,
        comment_id: commentId,
        content_preview: preview,
        sender: senderProfiles.find(p => p.id === actorId)
      };
    }) || [];

    const elapsed = performance.now() - startTime;
    console.log(`✅ DB query completed in ${elapsed.toFixed(2)}ms, storing in cache`);

    const responseData = {
      notifications: enrichedNotifications,
      unreadCount: unreadCount || 0,
      hasMore: notifications && notifications.length === limit,
      nextOffset: notifications && notifications.length === limit ? offset + limit : null,
    };

    // Store in cache (non-blocking)
    redis.set(cacheKey, responseData, cacheTTL).catch(err => 
      console.error('Failed to cache notifications:', err)
    );

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
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { queryTime: elapsed }
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );
  }
});
