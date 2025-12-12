import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Redis } from 'https://esm.sh/@upstash/redis@1.22.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const redis = new Redis({
      url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
      token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
    });

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { mediaUrls, action = 'get' } = await req.json();

    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      throw new Error('mediaUrls must be a non-empty array');
    }

    const results = [];

    for (const mediaUrl of mediaUrls) {
      const cacheKey = `media:v2:${mediaUrl}`;

      if (action === 'get') {
        // Try to get from cache first
        const cached = await redis.get(cacheKey);

        if (cached) {
          console.log(`✅ Media cache HIT: ${mediaUrl}`);
          results.push({
            originalUrl: mediaUrl,
            optimizedUrl: cached.optimizedUrl,
            thumbnailUrl: cached.thumbnailUrl,
            cached: true,
            performance: { cacheHit: true, responseTime: Date.now() }
          });
        } else {
          console.log(`❌ Media cache MISS: ${mediaUrl}`);

          // Generate optimized URLs
          const optimizedData = await generateOptimizedMedia(mediaUrl);
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov');

          // Cache for 24 hours (86400 seconds) for videos - much more aggressive
          const cacheTime = isVideo ? 86400 : 3600; // 24h for videos, 1h for images
          await redis.set(cacheKey, optimizedData, { ex: cacheTime });

          results.push({
            originalUrl: mediaUrl,
            ...optimizedData,
            cached: false,
            performance: { cacheHit: false, responseTime: Date.now() }
          });
        }
      } else if (action === 'invalidate') {
        // Invalidate cache for this media
        await redis.del(cacheKey);
        results.push({
          originalUrl: mediaUrl,
          invalidated: true
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        performance: {
          totalResponseTime: Date.now(),
          cachedCount: results.filter(r => r.cached).length,
          missedCount: results.filter(r => !r.cached).length
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache-Status': results.every(r => r.cached) ? 'HIT' : 'MISS'
        },
      }
    );

  } catch (error) {
    console.error('Error in cached-media function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );
  }
});

// Generate optimized media URLs
async function generateOptimizedMedia(mediaUrl: string) {
  const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov');

  if (isVideo) {
    // For videos, generate multiple quality URLs
    const baseUrl = mediaUrl.split('?')[0]; // Remove existing params

    return {
      optimizedUrl: mediaUrl, // Keep original for now
      thumbnailUrl: `${baseUrl}#t=1`, // Use 1 second mark for better thumbnail
      type: 'video',
      qualities: {
        high: mediaUrl,
        medium: mediaUrl, // Could add quality params later
        low: mediaUrl
      },
      poster: `${baseUrl}#t=1` // Better poster at 1 second
    };
  } else {
    // For images, generate optimized versions
    const separator = mediaUrl.includes('?') ? '&' : '?';

    // Check if it's a Supabase Storage URL
    if (mediaUrl.includes('supabase')) {
      return {
        optimizedUrl: `${mediaUrl}${separator}width=800&height=800&fit=crop&quality=85`,
        thumbnailUrl: `${mediaUrl}${separator}width=300&height=300&fit=crop&quality=70`,
        type: 'image',
        sizes: {
          thumbnail: `${mediaUrl}${separator}width=150&height=150&fit=crop&quality=70`,
          small: `${mediaUrl}${separator}width=400&height=400&fit=crop&quality=80`,
          medium: `${mediaUrl}${separator}width=800&height=800&fit=crop&quality=85`,
          large: `${mediaUrl}${separator}width=1200&height=1200&fit=crop&quality=90`
        }
      };
    }

    // For external images (like Unsplash), keep as is for now
    return {
      optimizedUrl: mediaUrl,
      thumbnailUrl: mediaUrl,
      type: 'image',
      sizes: {
        original: mediaUrl
      }
    };
  }
}
