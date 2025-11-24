import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringWeights {
  mutual_friends?: number;
  interactions?: number;
  location?: number;
  common_groups?: number;
  interests?: number;
}

interface RedisCache {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, ttl: number) => Promise<void>;
}

class UpstashRedis implements RedisCache {
  private baseUrl: string;
  private token: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    this.token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
    this.enabled = !!(this.baseUrl && this.token);
  }

  async get(key: string): Promise<any> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(`${this.baseUrl}/setex/${key}/${ttl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Custom scoring weights (optional)
    const weights: ScoringWeights = {
      mutual_friends: parseFloat(url.searchParams.get('w_mutual_friends') || '0.30'),
      interactions: parseFloat(url.searchParams.get('w_interactions') || '0.20'),
      location: parseFloat(url.searchParams.get('w_location') || '0.15'),
      common_groups: parseFloat(url.searchParams.get('w_common_groups') || '0.15'),
      interests: parseFloat(url.searchParams.get('w_interests') || '0.20'),
    };

    const cacheKey = `friend-suggestions:${user.id}:${limit}:${offset}:${JSON.stringify(weights)}`;
    const cacheTTL = 300; // 5 minutes

    const redis = new UpstashRedis();

    // Try to get from cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log('Cache HIT for friend suggestions', cacheKey);
      return new Response(
        JSON.stringify({
          ...cachedData,
          cached: true,
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

    console.log('Cache MISS for friend suggestions', cacheKey);
    console.log(`Fetching friend suggestions for user ${user.id} with weights:`, weights);

    // Call the advanced friend suggestions function
    const { data: suggestions, error } = await supabase.rpc('get_advanced_friend_suggestions', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      w_mutual_friends: weights.mutual_friends,
      w_interactions: weights.interactions,
      w_location: weights.location,
      w_common_groups: weights.common_groups,
      w_interests: weights.interests,
    });

    if (error) {
      console.error('Error fetching suggestions:', error);
      throw error;
    }

    console.log(`Found ${suggestions?.length || 0} suggestions for user ${user.id}`);

    // Transform response for better frontend usability
    const transformedSuggestions = (suggestions || []).map((s: any) => ({
      id: s.user_id,
      username: s.username,
      name: s.name,
      avatar_url: s.avatar_url,
      bio: s.bio,
      location: {
        city: s.city,
        region: s.region,
        country: s.country,
      },
      scores: {
        mutual_friends: s.mutual_friends_count,
        interaction: s.interaction_score,
        location: s.location_score,
        common_groups: s.common_groups_count,
        interest_similarity: s.interest_similarity,
        final: s.final_score,
      },
      reasons: s.suggestion_reasons,
    }));

    const hasMore = transformedSuggestions.length === limit;

    const responseData = {
      success: true,
      suggestions: transformedSuggestions,
      pagination: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
      weights,
      cached: false,
    };

    // Store in cache
    await redis.set(cacheKey, responseData, cacheTTL);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in friend-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
