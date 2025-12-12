#!/usr/bin/env node

/**
 * Script to set up Supabase storage buckets for chat functionality
 * Run this script to create the required buckets for chat media uploads
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

async function setupBuckets() {
  console.log('🚀 Setting up chat storage buckets...\n');

  for (const bucket of buckets) {
    try {
      console.log(`📦 Creating bucket: ${bucket.name}`);

      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error(`❌ Error listing buckets:`, listError.message);
        continue;
      }

      const bucketExists = existingBuckets.some(b => b.id === bucket.id);

      if (bucketExists) {
        console.log(`   ✅ Bucket '${bucket.name}' already exists`);
      } else {
        // Create the bucket
        const { error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types
        });

        if (createError) {
          console.error(`❌ Error creating bucket '${bucket.name}':`, createError.message);
        } else {
          console.log(`   ✅ Bucket '${bucket.name}' created successfully`);
        }
      }

      // Set up RLS policies for the bucket
      console.log(`   🔒 Setting up policies for '${bucket.name}'...`);

      // Allow authenticated users to upload to chat-media
      if (bucket.id === 'chat-media') {
        // Policy: Allow authenticated users to upload images/videos
        const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket.id,
          policy_name: 'Allow authenticated uploads',
          definition: `
            bucket_id = '${bucket.id}'
            AND auth.role() = 'authenticated'
          `
        }).catch(() => {
          // Ignore error if policy already exists
        });

        if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
          console.error(`   ❌ Error creating upload policy:`, uploadPolicyError.message);
        } else {
          console.log(`   ✅ Upload policy created/updated`);
        }
      }

      // Allow public read access for chat-media (since it's public)
      if (bucket.public) {
        const { error: readPolicyError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket.id,
          policy_name: 'Allow public read',
          definition: `bucket_id = '${bucket.id}'`
        }).catch(() => {
          // Ignore error if policy already exists
        });

        if (readPolicyError && !readPolicyError.message.includes('already exists')) {
          console.error(`   ❌ Error creating read policy:`, readPolicyError.message);
        } else {
          console.log(`   ✅ Read policy created/updated`);
        }
      }

    } catch (error) {
      console.error(`❌ Unexpected error with bucket '${bucket.name}':`, error.message);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🎉 Chat storage setup complete!');
  console.log('\n📋 Summary:');
  console.log('   - chat-media: For images and videos (public)');
  console.log('   - chat-files: For documents and files (private)');
  console.log('   - chat-voice: For voice messages (private)');
  console.log('\n💡 Make sure to configure CORS settings in Supabase Dashboard if needed.');
}

setupBuckets().catch(console.error);
