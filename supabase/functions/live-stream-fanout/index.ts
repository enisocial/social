import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { streamId, eventType, payload } = await req.json();

    // Validate stream exists and is live
    const { data: stream, error: streamError } = await supabaseClient
      .from('live_streams')
      .select('id, status')
      .eq('id', streamId)
      .eq('status', 'live')
      .single();

    if (streamError || !stream) {
      return new Response(JSON.stringify({ error: 'Stream not found or not live' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fanout event to all participants via Realtime
    const channel = supabaseClient.channel(`stream:${streamId}`);

    switch (eventType) {
      case 'chat': {
        // Insert chat message
        const { error } = await supabaseClient
          .from('live_chat_messages')
          .insert({
            stream_id: streamId,
            user_id: user.id,
            message: payload.message,
          });

        if (error) throw error;

        // Broadcast to all viewers
        await channel.send({
          type: 'broadcast',
          event: 'chat-message',
          payload: {
            userId: user.id,
            message: payload.message,
            timestamp: new Date().toISOString(),
          },
        });

        console.log('Chat message fanout:', streamId);
        break;
      }

      case 'gift': {
        // Insert gift
        const { error } = await supabaseClient
          .from('live_gifts')
          .insert({
            stream_id: streamId,
            sender_id: user.id,
            gift_type_id: payload.giftTypeId,
            quantity: payload.quantity || 1,
            total_value: payload.totalValue,
          });

        if (error) throw error;

        // Broadcast gift animation
        await channel.send({
          type: 'broadcast',
          event: 'gift',
          payload: {
            senderId: user.id,
            giftTypeId: payload.giftTypeId,
            quantity: payload.quantity || 1,
            timestamp: new Date().toISOString(),
          },
        });

        console.log('Gift fanout:', streamId, payload.giftTypeId);
        break;
      }

      case 'reaction': {
        // Insert reaction
        const { error } = await supabaseClient
          .from('live_reactions')
          .insert({
            stream_id: streamId,
            user_id: user.id,
            reaction_type: payload.reactionType,
          });

        if (error) throw error;

        // Broadcast reaction
        await channel.send({
          type: 'broadcast',
          event: 'reaction',
          payload: {
            userId: user.id,
            reactionType: payload.reactionType,
            timestamp: new Date().toISOString(),
          },
        });

        console.log('Reaction fanout:', streamId, payload.reactionType);
        break;
      }

      case 'viewer-joined':
      case 'viewer-left': {
        // Update participant status
        if (eventType === 'viewer-joined') {
          await supabaseClient
            .from('live_stream_participants')
            .upsert({
              stream_id: streamId,
              user_id: user.id,
              status: 'active',
              joined_at: new Date().toISOString(),
            });
        } else {
          await supabaseClient
            .from('live_stream_participants')
            .update({ status: 'left' })
            .eq('stream_id', streamId)
            .eq('user_id', user.id);
        }

        // Broadcast viewer change
        await channel.send({
          type: 'broadcast',
          event: eventType,
          payload: {
            userId: user.id,
            timestamp: new Date().toISOString(),
          },
        });

        // Update viewer count
        await supabaseClient.functions.invoke('live-stream-session', {
          body: { action: 'update-viewers', streamId },
        });

        console.log('Viewer status fanout:', streamId, eventType);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid event type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Live stream fanout error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
