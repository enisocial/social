import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoicePost {
  id: string;
  user_id: string;
  title?: string;
  audio_url: string;
  audio_duration: number;
  audio_size_bytes?: number;
  transcript?: string;
  waveform_data?: any;
  created_at: string;
  updated_at: string;
  username: string;
  name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  listens_count: number;
  user_liked?: boolean;
  user_listened?: boolean;
}

export interface VoicePostComment {
  id: string;
  voice_post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

export const useVoicePosts = () => {
  const [voicePosts, setVoicePosts] = useState<VoicePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch voice posts for feed
  const fetchVoicePosts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🎤 Fetching voice posts...');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Auth error:', userError);
        return;
      }
      if (!user) {
        console.log('No authenticated user');
        setVoicePosts([]);
        return;
      }

      console.log('User authenticated:', user.id);

      // Use direct query with JOIN to get all data (more reliable than view)
      let { data: posts, error } = await (supabase as any)
        .from('voice_posts')
        .select(`
          *,
          profiles!voice_posts_user_id_fkey(username, name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (posts && !error) {
        // Transform data to match expected format
        let transformedPosts = posts.map(post => ({
          id: post.id,
          user_id: post.user_id,
          title: post.title,
          audio_url: post.audio_url,
          audio_duration: post.audio_duration,
          audio_size_bytes: post.audio_size_bytes,
          transcript: post.transcript,
          waveform_data: post.waveform_data,
          created_at: post.created_at,
          updated_at: post.updated_at,
          username: post.profiles?.username || 'unknown',
          name: post.profiles?.name || 'Unknown User',
          avatar_url: post.profiles?.avatar_url || null,
          likes_count: 0, // Will be updated below
          comments_count: 0, // Will be updated below
          listens_count: 0 // Will be updated below
        }));

        // Get stats for all posts in one go for better performance
        if (posts.length > 0) {
          try {
            const postIds = posts.map(p => p.id);

            // Get all likes
            const { data: allLikes } = await (supabase as any)
              .from('voice_post_likes')
              .select('voice_post_id')
              .in('voice_post_id', postIds);

            // Get all comments
            const { data: allComments } = await (supabase as any)
              .from('voice_post_comments')
              .select('voice_post_id')
              .in('voice_post_id', postIds);

            // Get all listens
            const { data: allListens } = await (supabase as any)
              .from('voice_post_listens')
              .select('voice_post_id')
              .in('voice_post_id', postIds);

            // Count stats for each post
            const likesCount = allLikes?.reduce((acc, like) => {
              acc[like.voice_post_id] = (acc[like.voice_post_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};

            const commentsCount = allComments?.reduce((acc, comment) => {
              acc[comment.voice_post_id] = (acc[comment.voice_post_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};

            const listensCount = allListens?.reduce((acc, listen) => {
              acc[listen.voice_post_id] = (acc[listen.voice_post_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};

            // Update posts with real stats
            transformedPosts = transformedPosts.map(post => ({
              ...post,
              likes_count: likesCount[post.id] || 0,
              comments_count: commentsCount[post.id] || 0,
              listens_count: listensCount[post.id] || 0
            }));

          } catch (statsError) {
            console.error('Error fetching stats:', statsError);
            // Keep default stats (0) if stats fetch fails
          }
        }

        // Assign transformed posts to posts variable
        posts = transformedPosts;
      }

      if (error) {
        console.error('Error fetching voice posts:', error);
        toast.error('Erreur lors du chargement des posts vocaux');
        setVoicePosts([]);
        return;
      }

      console.log('Fetched voice posts:', posts?.length || 0);

      // Get user's interactions for each post
      const postIds = posts?.map(p => p.id) || [];

      if (postIds.length > 0) {
        try {
          // Get likes
          const { data: likes } = await (supabase as any)
            .from('voice_post_likes')
            .select('voice_post_id')
            .eq('user_id', user.id)
            .in('voice_post_id', postIds);

          // Get listens
          const { data: listens } = await (supabase as any)
            .from('voice_post_listens')
            .select('voice_post_id')
            .eq('user_id', user.id)
            .in('voice_post_id', postIds);

          // Mark user interactions
          const likedPosts = new Set(likes?.map(l => l.voice_post_id) || []);
          const listenedPosts = new Set(listens?.map(l => l.voice_post_id) || []);

          const postsWithInteractions = posts?.map(post => ({
            ...post,
            user_liked: likedPosts.has(post.id),
            user_listened: listenedPosts.has(post.id)
          })) || [];

          setVoicePosts(postsWithInteractions);
        } catch (interactionError) {
          console.error('Error fetching interactions:', interactionError);
          // Set posts without interactions if interaction fetch fails
          const postsWithoutInteractions = posts?.map(post => ({
            ...post,
            user_liked: false,
            user_listened: false
          })) || [];
          setVoicePosts(postsWithoutInteractions);
        }
      } else {
        setVoicePosts([]);
      }

    } catch (error) {
      console.error('Unexpected error fetching voice posts:', error);
      toast.error('Erreur inattendue lors du chargement');
      setVoicePosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create voice post with audio upload and compression
  const createVoicePost = useCallback(async (
    audioBlob: Blob,
    title?: string,
    onProgress?: (progress: number) => void,
    recordingTimeFallback?: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      onProgress?.(0);
      toast.loading('Compression audio en cours...', { id: 'voice-upload' });

      // Step 1: Compress audio (simulate compression for now)
      // In production, use libraries like lamejs for MP3 compression
      const compressedAudio = audioBlob; // TODO: Implement actual compression
      const audioDuration = await getAudioDuration(audioBlob);

      onProgress?.(25);

      // Step 2: Generate waveform data (simplified)
      const waveformData = await generateWaveformData(audioBlob);
      onProgress?.(50);

      // Step 3: Upload to Supabase Storage
      const fileName = `voice-${user.id}-${Date.now()}.mp3`;
      const filePath = `${user.id}/${fileName}`;

      toast.loading('Téléchargement audio...', { id: 'voice-upload' });

      const { error: uploadError } = await supabase.storage
        .from('voice-posts')
        .upload(filePath, compressedAudio, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erreur lors du téléchargement', { id: 'voice-upload' });
        return;
      }

      onProgress?.(75);

      // Step 4: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-posts')
        .getPublicUrl(filePath);

      onProgress?.(90);

      // Step 5: Create voice post record
      // Ensure audio_duration is valid (not Infinity or NaN)
      const validAudioDuration = isFinite(audioDuration) && audioDuration > 0
        ? Math.round(audioDuration)
        : recordingTimeFallback || 30; // Fallback to recordingTimeFallback or 30 seconds



      const voicePostData = {
        user_id: user.id,
        title: title || null,
        audio_url: publicUrl,
        audio_duration: validAudioDuration,
        audio_size_bytes: compressedAudio.size,
        waveform_data: waveformData
      };

      const { data: newPost, error: insertError } = await (supabase as any)
        .from('voice_posts')
        .insert(voicePostData)
        .select(`
          *,
          profiles!voice_posts_user_id_fkey(username, name, avatar_url)
        `)
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Erreur lors de la création du post', { id: 'voice-upload' });
        return;
      }

      onProgress?.(100);

      // Success

      toast.success('🎤 Post vocal publié avec succès !', { id: 'voice-upload' });

      // Refresh feed
      await fetchVoicePosts();

      // Trigger global refresh for VoicePostsSection
      setTimeout(() => {
        refreshVoicePostsGlobally();
      }, 1000); // Small delay to ensure local state is updated first

      // Invalider le cache du feed unifié pour que les nouveaux posts vocaux apparaissent
      try {
        // Dispatch un événement personnalisé pour rafraîchir le feed unifié
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('voice-post-created', {
            detail: { newPost }
          }));
        }
      } catch (error) {
        console.warn('Could not dispatch refresh event:', error);
      }

      return newPost;

    } catch (error) {
      console.error('Error creating voice post:', error);
      toast.error('Erreur lors de la création du post vocal', { id: 'voice-upload' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      onProgress?.(0);
    }
  }, [fetchVoicePosts]);

  // Like/Unlike voice post
  const toggleLike = useCallback(async (voicePostId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await (supabase as any)
        .from('voice_post_likes')
        .select('id')
        .eq('voice_post_id', voicePostId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await (supabase as any)
          .from('voice_post_likes')
          .delete()
          .eq('voice_post_id', voicePostId)
          .eq('user_id', user.id);
      } else {
        // Like
        await (supabase as any)
          .from('voice_post_likes')
          .insert({
            voice_post_id: voicePostId,
            user_id: user.id
          });
      }

      // Update local state
      setVoicePosts(prev => prev.map(post =>
        post.id === voicePostId
          ? {
              ...post,
              user_liked: !existingLike,
              likes_count: existingLike ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ));

    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Erreur lors de l\'interaction');
    }
  }, []);

  // Record listen event
  const recordListen = useCallback(async (
    voicePostId: string,
    listenDuration: number,
    completed: boolean = false
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await (supabase as any)
        .from('voice_post_listens')
        .upsert({
          voice_post_id: voicePostId,
          user_id: user.id,
          listen_duration: Math.round(listenDuration),
          completed
        }, {
          onConflict: 'voice_post_id,user_id'
        });

      // Update local state
      setVoicePosts(prev => prev.map(post =>
        post.id === voicePostId
          ? { ...post, user_listened: true }
          : post
      ));

    } catch (error) {
      console.error('Error recording listen:', error);
      // Don't show error to user for listen tracking
    }
  }, []);

  // Get comments for a voice post
  const getComments = useCallback(async (voicePostId: string): Promise<VoicePostComment[]> => {
    try {
      const { data: comments, error } = await (supabase as any)
        .from('voice_post_comments')
        .select(`
          *,
          profiles!voice_post_comments_user_id_fkey(username, name, avatar_url)
        `)
        .eq('voice_post_id', voicePostId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }

      return comments?.map(comment => ({
        id: comment.id,
        voice_post_id: comment.voice_post_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        username: comment.profiles?.username || 'unknown',
        name: comment.profiles?.name || 'Unknown User',
        avatar_url: comment.profiles?.avatar_url || null
      })) || [];

    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }, []);

  // Add comment to voice post
  const addComment = useCallback(async (voicePostId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('voice_post_comments')
        .insert({
          voice_post_id: voicePostId,
          user_id: user.id,
          content
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast.error('Erreur lors de l\'ajout du commentaire');
        return;
      }

      // Update local state
      setVoicePosts(prev => prev.map(post =>
        post.id === voicePostId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      ));

      toast.success('Commentaire ajouté');

    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  }, []);

  // Delete voice post (owner only)
  const deleteVoicePost = useCallback(async (voicePostId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get the post to check ownership and get audio URL
      const { data: post } = await (supabase as any)
        .from('voice_posts')
        .select('user_id, audio_url')
        .eq('id', voicePostId)
        .single();

      if (!post || post.user_id !== user.id) {
        toast.error('Vous ne pouvez pas supprimer ce post');
        return;
      }

      // Delete from database (cascade will handle related data)
      const { error: deleteError } = await (supabase as any)
        .from('voice_posts')
        .delete()
        .eq('id', voicePostId);

      if (deleteError) {
        console.error('Error deleting voice post:', deleteError);
        toast.error('Erreur lors de la suppression');
        return;
      }

      // Delete from storage
      try {
        const url = new URL(post.audio_url);
        const filePath = `${user.id}/${url.pathname.split('/').pop()}`;

        await supabase.storage
          .from('voice-posts')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not delete from storage:', storageError);
        // Don't fail the operation if storage cleanup fails
      }

      // Update local state
      setVoicePosts(prev => prev.filter(post => post.id !== voicePostId));

      toast.success('Post vocal supprimé');

    } catch (error) {
      console.error('Error deleting voice post:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchVoicePosts();
  }, [fetchVoicePosts]);

  return {
    voicePosts,
    loading,
    uploading,
    uploadProgress,
    createVoicePost,
    toggleLike,
    recordListen,
    getComments,
    addComment,
    deleteVoicePost,
    refetch: fetchVoicePosts
  };
};

// Hook pour partager l'état de refresh entre composants
let globalRefreshCallback: (() => void) | null = null;

export const setVoicePostsRefreshCallback = (callback: () => void) => {
  globalRefreshCallback = callback;
};

export const refreshVoicePostsGlobally = () => {
  if (globalRefreshCallback) {
    globalRefreshCallback();
  }
};

// Utility functions
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };

    audio.onerror = () => {
      reject(new Error('Could not load audio metadata'));
    };

    audio.src = URL.createObjectURL(blob);
  });
}

async function generateWaveformData(blob: Blob): Promise<number[]> {
  // Simplified waveform generation
  // In production, use libraries like waveform-data or audiowaveform
  return new Promise((resolve) => {
    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Generate simplified waveform data
        const channelData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of waveform points
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = Math.floor((i / samples) * channelData.length);
          const end = Math.floor(((i + 1) / samples) * channelData.length);
          let sum = 0;

          for (let j = start; j < end; j++) {
            sum += Math.abs(channelData[j]);
          }

          waveform.push(sum / (end - start));
        }

        resolve(waveform);
      } catch (error) {
        console.warn('Could not generate waveform:', error);
        resolve(new Array(100).fill(0.5)); // Fallback
      }
    };

    reader.readAsArrayBuffer(blob);
  });
}
