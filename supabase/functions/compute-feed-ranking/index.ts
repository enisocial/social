import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RankingWeights {
  w1?: number; // recency
  w2?: number; // engagement
  w3?: number; // affinity
  w4?: number; // content_type
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    const { userId, weights, limit } = await req.json();
    const targetUserId = userId || user.id;

    // Default weights (Facebook-inspired)
    const rankingWeights: RankingWeights = {
      w1: weights?.w1 ?? 0.25, // recency - 25%
      w2: weights?.w2 ?? 0.35, // engagement - 35%
      w3: weights?.w3 ?? 0.30, // affinity - 30%
      w4: weights?.w4 ?? 0.10, // content_type - 10%
    };

    const maxItems = limit || 100;

    console.log(`Computing feed ranking for user ${targetUserId} with weights:`, rankingWeights);

    // Call populate_timeline_for_user function
    const { data, error } = await supabase.rpc('populate_timeline_for_user', {
      p_user_id: targetUserId,
      p_limit: maxItems,
      w1: rankingWeights.w1,
      w2: rankingWeights.w2,
      w3: rankingWeights.w3,
      w4: rankingWeights.w4,
    });

    if (error) {
      console.error('Error populating timeline:', error);
      throw error;
    }

    console.log(`Successfully populated ${data} timeline items for user ${targetUserId}`);

    // Get sample of top ranked items for verification
    const { data: samplePosts, error: sampleError } = await supabase
      .from('timeline_items')
      .select(`
        ranking_score,
        recency_decay,
        engagement_score,
        affinity_score,
        content_type_weight,
        variant,
        posts:post_id (
          id,
          content,
          created_at,
          profiles:user_id (
            username,
            name
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('ranking_score', { ascending: false })
      .limit(20);

    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        itemsProcessed: data,
        weights: rankingWeights,
        variant: samplePosts?.[0]?.variant || 'unknown',
        topPosts: samplePosts?.map((item: any) => ({
          ranking_score: item.ranking_score,
          recency_decay: item.recency_decay,
          engagement_score: item.engagement_score,
          affinity_score: item.affinity_score,
          content_type_weight: item.content_type_weight,
          post: {
            id: item.posts?.id,
            content: item.posts?.content?.substring(0, 100),
            created_at: item.posts?.created_at,
            author: item.posts?.profiles?.name || item.posts?.profiles?.username,
          },
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in compute-feed-ranking:', error);
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