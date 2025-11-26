import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';
import { redis } from '../_shared/redis.ts';

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
    const bustCache = url.searchParams.get('bustCache') === 'true';
    
    const cacheKey = `conversations:v1:${user.id}`;
    const cacheTTL = 60; // 1 minute (conversations list changes moderately)

    // Bust cache if requested
    if (bustCache) {
      await redis.del(cacheKey);
      console.log('🗑️ Cache busted for', cacheKey);
    }

    // Try to get from cache
    const cachedData = await redis.get(cacheKey) as { conversations: unknown[] } | null;
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

    // Fetch conversations with optimized query
    const { data: myParticipants, error: partError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        unread_count,
        conversations!inner(
          id,
          created_at,
          updated_at,
          type,
          title
        )
      `)
      .eq('user_id', user.id)
      .order('conversations(updated_at)', { ascending: false });

    if (partError) throw partError;

    if (!myParticipants || myParticipants.length === 0) {
      const emptyResponse = { conversations: [] };
      await redis.set(cacheKey, emptyResponse, cacheTTL);
      
      return new Response(
        JSON.stringify({ 
          ...emptyResponse,
          cached: false,
          performance: { queryTime: performance.now() - startTime, cacheHit: false }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
          } 
        }
      );
    }

    const conversationIds = myParticipants.map(p => p.conversation_id);

    // Fetch other participants and last messages in parallel
    const [{ data: otherParticipants }, { data: lastMessages }] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, profiles(id, username, name, avatar_url)')
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id),
      supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
    ]);

    // Group last messages by conversation
    const lastMsgMap = new Map();
    lastMessages?.forEach(msg => {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg);
      }
    });

    // Group other participants by conversation
    const otherParticipantsMap = new Map();
    otherParticipants?.forEach(p => {
      otherParticipantsMap.set(p.conversation_id, p);
    });

    // Build enriched conversations
    const enrichedConversations = myParticipants
      .map(myPart => {
        const conv = myPart.conversations as any;
        const otherPart = otherParticipantsMap.get(myPart.conversation_id);
        const lastMsg = lastMsgMap.get(myPart.conversation_id);

        if (!otherPart?.profiles) return null;

        return {
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          type: conv.type,
          title: conv.title,
          otherUser: otherPart.profiles,
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at
          } : undefined,
          unreadCount: myPart.unread_count || 0
        };
      })
      .filter(Boolean);

    const elapsed = performance.now() - startTime;
    console.log(`✅ DB query completed in ${elapsed.toFixed(2)}ms, storing in cache`);

    const responseData = {
      conversations: enrichedConversations,
    };

    // Store in cache (non-blocking)
    redis.set(cacheKey, responseData, cacheTTL).catch(err => 
      console.error('Failed to cache conversations:', err)
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
