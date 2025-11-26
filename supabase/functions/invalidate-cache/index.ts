import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';
import { redis } from '../_shared/redis.ts';

/**
 * Cache Invalidation Edge Function
 * 
 * Automatically invalidates Redis cache based on database events.
 * Supports pattern-based invalidation for multiple cache keys.
 * 
 * Usage:
 * POST /invalidate-cache
 * Body: { type: 'feed' | 'notifications' | 'messages' | 'friend-suggestions', userId: string }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { type, userId, pattern } = await req.json();

    if (!type && !pattern) {
      throw new Error('Either type or pattern is required');
    }

    const targetUserId = userId || user.id;
    const invalidatedKeys: string[] = [];

    // Invalidate based on type
    if (type) {
      let cachePatterns: string[] = [];

      switch (type) {
        case 'feed':
          cachePatterns = [`feed:*:${targetUserId}:*`];
          break;
        case 'notifications':
          cachePatterns = [`notifications:*:${targetUserId}:*`];
          break;
        case 'messages':
          cachePatterns = [`unread-messages:*:${targetUserId}`];
          break;
        case 'conversations':
          cachePatterns = [`conversations:*:${targetUserId}`, `messages:*:*:*`];
          break;
        case 'live-chat':
          cachePatterns = [`live-chat:*:*`];
          break;
        case 'friend-suggestions':
          cachePatterns = [`friend-suggestions:${targetUserId}:*`];
          break;
        case 'all':
          cachePatterns = [
            `feed:*:${targetUserId}:*`,
            `notifications:*:${targetUserId}:*`,
            `unread-messages:*:${targetUserId}`,
            `conversations:*:${targetUserId}`,
            `messages:*:*:*`,
            `live-chat:*:*`,
            `friend-suggestions:${targetUserId}:*`,
          ];
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }

      // Get all matching keys and delete them
      for (const pattern of cachePatterns) {
        const keys = await redis.keys(pattern);
        for (const key of keys) {
          await redis.del(key);
          invalidatedKeys.push(key);
        }
      }
    }

    // Invalidate based on custom pattern
    if (pattern) {
      const keys = await redis.keys(pattern);
      for (const key of keys) {
        await redis.del(key);
        invalidatedKeys.push(key);
      }
    }

    console.log(`✅ Invalidated ${invalidatedKeys.length} cache keys for user ${targetUserId}`);

    return new Response(
      JSON.stringify({
        success: true,
        invalidatedKeys,
        count: invalidatedKeys.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
