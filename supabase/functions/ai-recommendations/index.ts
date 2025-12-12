import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's interaction history
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id, posts(content, user_id, profiles(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: comments } = await supabase
      .from('comments')
      .select('post_id, text, posts(content, user_id, profiles(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's friends
    const { data: friends } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    const friendIds = friends?.map(f => 
      f.sender_id === userId ? f.receiver_id : f.sender_id
    ) || [];

    // Prepare context for AI
    const likedContent = likes?.map(l => (l.posts as any)?.content).filter(Boolean).join('\n') || '';
    const commentedContent = comments?.map(c => c.text).filter(Boolean).join('\n') || '';

    // Call Lovable AI for recommendations
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un système de recommandation pour un réseau social. Analyse les interactions de l'utilisateur et suggère des types de contenu pertinents. Réponds uniquement avec des catégories de contenu séparées par des virgules (max 5 catégories).`
          },
          {
            role: 'user',
            content: `Contenu aimé: ${likedContent}\n\nCommentaires: ${commentedContent}\n\nSuggère des catégories de contenu pertinentes.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const categories = aiData.choices[0]?.message?.content || '';

    // Get recommended posts based on categories and user interests
    const { data: recommendedPosts } = await supabase
      .from('posts')
      .select('*, profiles(*), likes(count), comments(count)')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        success: true,
        categories: categories.split(',').map((c: string) => c.trim()),
        posts: recommendedPosts || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
