// @deno-types="https://esm.sh/@supabase/supabase-js@2.81.1/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    // Only allow service role key for this function
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('Service role key required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🧹 Starting cleanup of expired stories...');

    // Get count of expired stories before cleanup
    const { count: expiredCount } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());

    console.log(`📊 Found ${expiredCount || 0} expired stories to clean up`);

    // Delete expired stories and their associated data
    const { data: deletedStories, error: deleteError } = await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id, media_url, user_id');

    if (deleteError) {
      console.error('❌ Error deleting expired stories:', deleteError);
      throw deleteError;
    }

    const deletedCount = deletedStories?.length || 0;
    console.log(`✅ Successfully deleted ${deletedCount} expired stories`);

    // Clean up story_views for deleted stories (cascade should handle this, but let's be safe)
    if (deletedStories && deletedStories.length > 0) {
      const storyIds = deletedStories.map((story: { id: string }) => story.id);
      const { error: viewsError } = await supabase
        .from('story_views')
        .delete()
        .in('story_id', storyIds);

      if (viewsError) {
        console.warn('⚠️ Warning: Could not clean up story views:', viewsError);
      } else {
        console.log(`🧽 Cleaned up story views for ${storyIds.length} stories`);
      }
    }

    // Optional: Clean up storage files for deleted stories
    // Note: This is commented out as storage cleanup might be expensive
    // and stories storage bucket should have lifecycle policies
    /*
    if (deletedStories && deletedStories.length > 0) {
      for (const story of deletedStories) {
        if (story.media_url) {
          try {
            // Extract file path from public URL
            const url = new URL(story.media_url);
            const filePath = `${story.user_id}/${url.pathname.split('/').pop()}`;

            const { error: storageError } = await supabase.storage
              .from('stories')
              .remove([filePath]);

            if (storageError) {
              console.warn(`⚠️ Could not delete storage file ${filePath}:`, storageError);
            }
          } catch (storageCleanupError) {
            console.warn('⚠️ Error during storage cleanup:', storageCleanupError);
          }
        }
      }
    }
    */

    const elapsed = performance.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        expiredCount: expiredCount || 0,
        performance: { executionTime: elapsed }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    const elapsed = performance.now() - startTime;
    console.error('❌ Cleanup error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: elapsed }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
