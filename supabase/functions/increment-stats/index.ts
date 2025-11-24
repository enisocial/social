import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatUpdate {
  table: 'posts' | 'likes' | 'comments' | 'follows' | 'messages';
  action: 'increment' | 'decrement';
  user_id?: string;
  post_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { table, action, user_id, post_id }: StatUpdate = await req.json();

    console.log(`Processing stat update: ${table} ${action}`, { user_id, post_id });

    // This function handles background stat updates to reduce load on main queries
    // Stats are eventually consistent rather than immediately accurate
    
    let result;
    const operation = action === 'increment' ? '+' : '-';

    switch (table) {
      case 'posts':
        // Update user post count
        result = await supabase.rpc('update_user_post_count', {
          uid: user_id,
          change: action === 'increment' ? 1 : -1
        });
        break;
      
      case 'likes':
        // Update post like count
        result = await supabase.rpc('update_post_like_count', {
          pid: post_id,
          change: action === 'increment' ? 1 : -1
        });
        break;
      
      case 'comments':
        // Update post comment count
        result = await supabase.rpc('update_post_comment_count', {
          pid: post_id,
          change: action === 'increment' ? 1 : -1
        });
        break;
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating stats:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
