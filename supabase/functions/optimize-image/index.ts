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
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    const width = parseInt(url.searchParams.get('width') || '800');
    const format = url.searchParams.get('format') || 'webp';

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Use Deno's built-in image processing or return with optimization headers
    const optimizedHeaders = {
      ...corsHeaders,
      'Content-Type': format === 'avif' ? 'image/avif' : 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000',
      'Cloudflare-CDN-Cache-Control': 'public, max-age=31536000',
    };

    // For now, return the original image with optimization headers
    // In production, integrate with an image processing service
    return new Response(imageBuffer, { headers: optimizedHeaders });

  } catch (error) {
    console.error('Image optimization error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
