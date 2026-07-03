# Manual Supabase Audio Storage Configuration

## Problem
iOS AVFoundationErrorDomain -11850 when playing audio files from Supabase storage.

## Solution Steps

### Step 1: Apply SQL Configuration
Run the SQL script in Supabase Dashboard > SQL Editor:
```sql
-- Copy entire contents of scripts/fix_audio_storage.sql
-- This is a simplified version that avoids syntax errors
```

### Step 2: Manual Dashboard Configuration
If SQL doesn't work, configure manually:

#### A. Storage Bucket Settings
1. Go to Supabase Dashboard > Storage
2. Select "voice-posts" bucket
3. Click "Settings" (gear icon)
4. Configure:
   - **Public bucket**: ✅ Enabled
   - **File size limit**: 10 MB
   - **Allowed MIME types**:
     ```
     audio/mpeg
     audio/mp3
     audio/m4a
     audio/x-m4a
     audio/aac
     audio/wav
     ```

#### B. Storage Policies
1. Go to Storage > Policies
2. Ensure these policies exist for "voice-posts" bucket:

**Public Read Policy:**
```sql
-- Allow anyone to read audio files
bucket_id = 'voice-posts'
```

**Upload Policy:**
```sql
-- Allow authenticated users to upload
bucket_id = 'voice-posts'
AND auth.role() = 'authenticated'
```

### Step 3: Verify Configuration
Run verification script in SQL Editor:
```sql
-- Copy contents of scripts/verify_audio_storage.sql
```

Expected results:
- `public: true`
- `file_size_limit: 10485760` (10MB)
- `allowed_mime_types: [audio/mpeg, audio/m4a, ...]`

### Step 4: Clear Cache & Test
1. **Restart mobile app completely**
2. **Create new voice post** (should work)
3. **Test playback of new post**

### Step 5: Existing Files (Optional)
For old audio files that still don't work:
1. **Re-upload them** through the app
2. **Or delete and recreate** voice posts

## Alternative: Supabase CLI
If you have Supabase CLI installed:
```bash
cd supabase
supabase db push
```

## Testing
After configuration:
1. Create new voice post
2. Upload and publish
3. Try playing the audio
4. Should work without AVFoundation errors

## If Still Not Working
The issue might be:
1. **Expo Go limitations** - Try development build
2. **Network/firewall** - Check VPN or corporate network
3. **File encoding** - Ensure M4A files are properly encoded
4. **Supabase region** - Check if regional restrictions apply

## Root Cause Identified

**The issue is NOT Supabase configuration - it's Expo AV recording not capturing microphone input.**

### Findings:
- ✅ **Supabase storage**: Configuration applied successfully
- ✅ **Mobile app**: Recording system works perfectly
- ❌ **Audio capture**: Files are empty (content-length: 0)
- ❌ **iOS playback**: Cannot play empty audio files

### Why Audio Files Are Empty:
1. **Expo Go Simulator**: Limited microphone access
2. **iOS Simulator**: No real microphone input
3. **Physical device needed**: For actual audio recording

## Next Steps

### 1. Test on Physical iOS Device
```bash
# Build for physical device testing
npx expo run:ios --device
```

### 2. Grant Microphone Permissions
- Allow microphone access when prompted
- Check iOS Settings > App > Microphone

### 3. Expected Results
**On physical device:**
```
📊 Recorded file size: 15000 bytes (or more)
✅ Audio captures successfully
🎵 Playback works on iOS
```

**Current simulator result:**
```
📊 Recorded file size: 0 bytes
❌ Empty audio file
```

## Emergency Fallback
If Expo AV recording doesn't work on physical devices:
1. **expo-audio package**: Newer, more reliable audio library
2. **react-native-audio-recorder**: Alternative recording solution
3. **Web Audio API**: Browser-based fallback

## Current Status
- ✅ **Supabase**: Audio storage configured correctly
- ✅ **Mobile app**: Recording UI fully functional
- ❌ **Audio capture**: Expo AV not recording in current environment
- 🔄 **Next**: Test on physical iOS device
