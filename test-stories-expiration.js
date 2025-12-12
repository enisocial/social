import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStoriesExpiration() {
  console.log('🧪 Testing Stories Expiration System...\n');

  try {
    // Test 1: Check if stories table has expires_at column
    console.log('1️⃣ Checking stories table structure...');
    const { data: sampleStory, error: structureError } = await supabase
      .from('stories')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Error checking table structure:', structureError.message);
      return;
    }

    if (sampleStory && sampleStory.length > 0) {
      console.log('✅ Stories table columns:', Object.keys(sampleStory[0]));
      console.log('✅ expires_at column present:', 'expires_at' in sampleStory[0]);
    } else {
      console.log('ℹ️ No stories in table yet');
    }

    // Test 2: Create a test story and check expiration time
    console.log('\n2️⃣ Testing story creation with expiration...');

    // First, we need to be authenticated to create a story
    // This test assumes you're logged in, otherwise it will skip creation test

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('⚠️ Not authenticated - skipping story creation test');
      console.log('Please run this test while logged in to test story creation');
    } else {
      console.log('✅ User authenticated:', user.id);

      // Create a test story (you might need to upload an actual file for this to work)
      // For now, let's just check existing stories expiration times
    }

    // Test 3: Check existing stories expiration
    console.log('\n3️⃣ Checking existing stories expiration times...');

    const { data: stories, error: fetchError } = await supabase
      .from('stories')
      .select('id, user_id, expires_at, created_at')
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching stories:', fetchError.message);
    } else if (stories && stories.length > 0) {
      console.log('📋 Recent stories:');
      stories.forEach((story, index) => {
        const createdAt = new Date(story.created_at);
        const expiresAt = new Date(story.expires_at);
        const now = new Date();
        const isExpired = expiresAt <= now;

        console.log(`  ${index + 1}. Story ${story.id.slice(0, 8)}...`);
        console.log(`     Created: ${createdAt.toISOString()}`);
        console.log(`     Expires: ${expiresAt.toISOString()}`);
        console.log(`     Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
        console.log(`     Time until expiry: ${isExpired ? 'Expired' : Math.round((expiresAt - now) / (1000 * 60 * 60)) + ' hours'}`);
      });
    } else {
      console.log('ℹ️ No stories found in database');
    }

    // Test 4: Test the cleanup function (requires admin/service role)
    console.log('\n4️⃣ Testing cleanup function...');

    try {
      // Try to call the cleanup function (this requires appropriate permissions)
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_expired_stories');

      if (cleanupError) {
        console.log('⚠️ Cleanup function not accessible or error:', cleanupError.message);
        console.log('This is normal if you don\'t have admin permissions');
      } else {
        console.log('✅ Cleanup function executed successfully:');
        console.log('   Deleted stories:', cleanupResult[0]?.deleted_count || 0);
        console.log('   Execution time:', cleanupResult[0]?.execution_time || 'N/A');
      }
    } catch (e) {
      console.log('⚠️ Could not test cleanup function (requires proper permissions)');
    }

    // Test 5: Check expired stories stats view
    console.log('\n5️⃣ Checking expired stories statistics...');

    try {
      const { data: stats, error: statsError } = await supabase
        .from('expired_stories_stats')
        .select('*');

      if (statsError) {
        console.log('⚠️ Could not access stats view:', statsError.message);
      } else if (stats && stats.length > 0) {
        const stat = stats[0];
        console.log('📊 Expired stories statistics:');
        console.log(`   Total expired: ${stat.total_expired}`);
        console.log(`   Expired > 1h: ${stat.expired_over_1h}`);
        console.log(`   Expired > 6h: ${stat.expired_over_6h}`);
        console.log(`   Expired > 24h: ${stat.expired_over_24h}`);
        if (stat.oldest_expired_at) {
          console.log(`   Oldest expired: ${new Date(stat.oldest_expired_at).toISOString()}`);
        }
      } else {
        console.log('ℹ️ No expired stories statistics available');
      }
    } catch (e) {
      console.log('⚠️ Could not check stats view');
    }

    console.log('\n🎉 Stories expiration test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testStoriesExpiration();
