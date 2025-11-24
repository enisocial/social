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

    const { action, streamId, offer, answer, candidate } = await req.json();

    switch (action) {
      case 'start': {
        // Create live stream session
        const { data: stream, error } = await supabaseClient
          .from('live_streams')
          .insert({
            user_id: user.id,
            title: 'Live Stream',
            status: 'live',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        console.log('Stream started:', stream.id);

        return new Response(JSON.stringify({ streamId: stream.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'stop': {
        // End live stream session
        const { error } = await supabaseClient
          .from('live_streams')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', streamId)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('Stream stopped:', streamId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'signal': {
        // WebRTC signaling via Realtime
        const channel = supabaseClient.channel(`stream:${streamId}`);
        
        if (offer) {
          await channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { offer, from: user.id },
          });
        }
        
        if (answer) {
          await channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { answer, from: user.id },
          });
        }
        
        if (candidate) {
          await channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate, from: user.id },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update-viewers': {
        // Update viewer count
        const { data: participants } = await supabaseClient
          .from('live_stream_participants')
          .select('id', { count: 'exact' })
          .eq('stream_id', streamId)
          .eq('status', 'active');

        const viewerCount = participants?.length || 0;

        await supabaseClient
          .from('live_streams')
          .update({ viewer_count: viewerCount })
          .eq('id', streamId);

        console.log('Viewer count updated:', streamId, viewerCount);

        return new Response(JSON.stringify({ viewerCount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Live stream session error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
