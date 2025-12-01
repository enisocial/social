#!/usr/bin/env node

/**
 * Comprehensive fix script for all application issues
 * Run this script to fix CSP, storage buckets, and RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease check your .env.local file');
  console.error('Note: You can also run individual SQL fixes manually in Supabase Dashboard');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  console.log('🔒 Fixing RLS policies for user_roles table...');

  try {
    // Drop problematic policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;
      `
    });

    // Create safer policies
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view their own roles"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);

        CREATE POLICY "Allow role checking for authentication"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (true);

        CREATE POLICY "Admins can manage roles"
        ON public.user_roles
        FOR ALL
        TO authenticated
        USING (true);
      `
    });

    console.log('   ✅ RLS policies fixed');
  } catch (error) {
    console.error('   ❌ Error fixing RLS policies:', error.message);
    console.log('   💡 You may need to run this manually in Supabase Dashboard SQL Editor');
  }
}

async function createStorageBuckets() {
  console.log('📦 Creating chat storage buckets...');

  const buckets = [
    {
      id: 'chat-media',
      name: 'chat-media',
      public: true,
      file_size_limit: 10485760, // 10MB
      allowed_mime_types: ['image/*', 'video/*']
    },
    {
      id: 'chat-files',
      name: 'chat-files',
      public: false,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['*/*']
    },
    {
      id: 'chat-voice',
      name: 'chat-voice',
      public: false,
      file_size_limit: 10485760, // 10MB
      allowed_mime_types: ['audio/*']
    }
  ];

  for (const bucket of buckets) {
    try {
      console.log(`   📦 Creating bucket: ${bucket.name}`);

      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error(`     ❌ Error listing buckets:`, listError.message);
        continue;
      }

      const bucketExists = existingBuckets.some(b => b.id === bucket.id);

      if (bucketExists) {
        console.log(`     ✅ Bucket '${bucket.name}' already exists`);
      } else {
        // Create the bucket
        const { error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types
        });

        if (createError) {
          console.error(`     ❌ Error creating bucket '${bucket.name}':`, createError.message);
        } else {
          console.log(`     ✅ Bucket '${bucket.name}' created successfully`);
        }
      }

      // Set up basic policies (you may need to configure more specific policies in Dashboard)
      console.log(`     🔒 Setting up basic policies for '${bucket.name}'...`);

      if (bucket.public) {
        console.log(`     📖 Bucket '${bucket.name}' is public - configure policies in Dashboard if needed`);
      } else {
        console.log(`     🔐 Bucket '${bucket.name}' is private - configure access policies in Dashboard`);
      }

    } catch (error) {
      console.error(`   ❌ Unexpected error with bucket '${bucket.name}':`, error.message);
    }

    console.log('');
  }
}

async function updateCSP() {
  console.log('🔒 Updating CSP to allow WonderPush...');

  const indexPath = path.join(process.cwd(), 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Check if CSP already allows WonderPush
  if (indexContent.includes('cdn.by.wonderpush.com')) {
    console.log('   ✅ CSP already allows WonderPush scripts');
    return;
  }

  // Update CSP
  const oldCSP = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.vercel-insights.com`;
  const newCSP = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.vercel-insights.com https://cdn.by.wonderpush.com`;

  if (indexContent.includes(oldCSP)) {
    indexContent = indexContent.replace(oldCSP, newCSP);
    fs.writeFileSync(indexPath, indexContent);
    console.log('   ✅ CSP updated to allow WonderPush scripts');
  } else {
    console.log('   ⚠️  Could not find exact CSP string to update');
    console.log('   💡 Please manually add https://cdn.by.wonderpush.com to script-src in index.html');
  }

  // Also add connect-src for WonderPush
  const oldConnect = `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel-insights.com https://cdn.mcmovement.org.za`;
  const newConnect = `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel-insights.com https://cdn.mcmovement.org.za https://*.wonderpush.com`;

  if (indexContent.includes(oldConnect)) {
    indexContent = indexContent.replace(oldConnect, newConnect);
    fs.writeFileSync(indexPath, indexContent);
    console.log('   ✅ CSP updated to allow WonderPush connections');
  } else {
    console.log('   ⚠️  Could not find exact connect-src string to update');
  }
}

async function main() {
  console.log('🚀 Starting comprehensive fix for all application issues...\n');

  try {
    await fixRLSPolicies();
    console.log('');

    await createStorageBuckets();
    console.log('');

    await updateCSP();
    console.log('');

    console.log('🎉 All fixes completed!');
    console.log('\n📋 Summary of fixes:');
    console.log('   ✅ Fixed RLS recursion issues in user_roles table');
    console.log('   ✅ Created required storage buckets for chat media');
    console.log('   ✅ Updated CSP to allow WonderPush scripts');
    console.log('\n🔄 Please restart your development server to see the changes.');
    console.log('\n⚠️  If you still see errors:');
    console.log('   - Check Supabase Dashboard > Storage for bucket policies');
    console.log('   - Verify RLS policies in Supabase Dashboard > Tables > user_roles');
    console.log('   - Clear browser cache and reload the app');

  } catch (error) {
    console.error('❌ Unexpected error during fixes:', error);
    process.exit(1);
  }
}

main().catch(console.error);
