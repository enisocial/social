import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  expires_at: string;
  text?: string;
  text_position?: {
    x: number;
    y: number;
  };
  text_color?: string;
  text_size?: number;
  profiles: {
    username: string;
    name: string;
    avatar_url: string | null;
  };
  views?: number;
  hasViewed?: boolean;
}

export interface StoryGroup {
  userId: string;
  username: string;
  name: string;
  avatar_url: string | null;
  stories: Story[];
  hasViewed: boolean;
}

export const useStories = () => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchStories();

    const channel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStories = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }
      if (!user) {
        console.log('No user logged in');
        return;
      }

      console.log('Fetching stories for user:', user.id);

      // Récupérer les amis de l'utilisateur
      const { data: friendships, error: friendsError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendsError) {
        console.error('Error fetching friendships:', friendsError);
        toast.error('Erreur lors du chargement des amis');
        return;
      }

      // Créer une liste des IDs d'amis
      const friendIds = friendships?.map(f =>
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      ) || [];

      // Ajouter l'ID de l'utilisateur pour voir ses propres stories
      const allowedUserIds = [...friendIds, user.id];

      console.log('Allowed user IDs:', allowedUserIds);

      // D'abord vérifier la structure de la table stories
      console.log('Checking stories table structure...');
      try {
        const { data: testData, error: testError } = await supabase
          .from('stories')
          .select('*')
          .limit(1);

        if (testError) {
          console.error('Table stories structure error:', testError);
          toast.error(`Erreur table stories: ${testError.message}`);
          return;
        }

        console.log('Stories table columns available:', Object.keys(testData?.[0] || {}));
      } catch (e) {
        console.error('Error checking table structure:', e);
      }

      // Récupérer uniquement les stories des amis et de l'utilisateur
      // Utiliser une requête simple d'abord pour éviter les erreurs de colonnes
      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type')
        .in('user_id', allowedUserIds)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Erreur lors du chargement des stories: ${error.message}`);
        return;
      }

      // Récupérer les informations des profils séparément
      if (stories && stories.length > 0) {
        const userIds = [...new Set(stories.map(s => s.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Associer les profils aux stories
        stories.forEach(story => {
          const profile = profiles?.find(p => p.id === story.user_id);
          if (profile) {
            (story as any).profiles = profile;
          }
        });
      }

      console.log('Fetched stories:', stories?.length || 0);

      // Group stories by user
      const grouped = new Map<string, StoryGroup>();

      for (const story of stories as Story[]) {
        if (!grouped.has(story.user_id)) {
          // Get view count for each story
          const { count } = await supabase
            .from('story_views')
            .select('*', { count: 'exact' })
            .eq('story_id', story.id);

          // Check if current user viewed this story
          const { data: viewData } = await supabase
            .from('story_views')
            .select('id')
            .eq('story_id', story.id)
            .eq('viewer_id', user.id)
            .single();

          grouped.set(story.user_id, {
            userId: story.user_id,
            username: story.profiles.username,
            name: story.profiles.name,
            avatar_url: story.profiles.avatar_url,
            stories: [{
              ...story,
              views: count || 0,
              hasViewed: !!viewData
            }],
            hasViewed: !!viewData
          });
        } else {
          const group = grouped.get(story.user_id)!;

          const { count } = await supabase
            .from('story_views')
            .select('*', { count: 'exact' })
            .eq('story_id', story.id);

          const { data: viewData } = await supabase
            .from('story_views')
            .select('id')
            .eq('story_id', story.id)
            .eq('viewer_id', user.id)
            .single();

          group.stories.push({
            ...story,
            views: count || 0,
            hasViewed: !!viewData
          });

          if (!viewData) {
            group.hasViewed = false;
          }
        }
      }

      // Sort: user's own stories first, then unviewed, then viewed
      const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
        if (a.userId === user.id) return -1;
        if (b.userId === user.id) return 1;
        if (!a.hasViewed && b.hasViewed) return -1;
        if (a.hasViewed && !b.hasViewed) return 1;
        return 0;
      });

      setStoryGroups(sortedGroups);
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error in fetchStories:', error);
      toast.error('Erreur inattendue lors du chargement des stories');
      setLoading(false);
    }
  };

  const createStory = useCallback(async (file: File, textOverlay?: {
    text: string;
    text_position: { x: number; y: number };
    text_color: string;
    text_size: number;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      toast.loading(`Téléchargement de ${mediaType === 'video' ? 'la vidéo' : 'la photo'} en cours...`, { id: 'story-upload' });

      // Smooth progress simulation with realistic speed
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random increment between 5-20%
        if (progress > 90) {
          progress = 90;
          clearInterval(progressInterval);
        }
        setUploadProgress(Math.floor(progress));
      }, 150);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) {
        toast.error('Erreur lors de l\'upload', { id: 'story-upload' });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(95);

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      const storyData: any = {
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaType
      };

      if (textOverlay) {
        storyData.text = textOverlay.text;
        storyData.text_position = textOverlay.text_position;
        storyData.text_color = textOverlay.text_color;
        storyData.text_size = textOverlay.text_size;
      }

      const { error: insertError } = await supabase
        .from('stories')
        .insert(storyData);

      if (insertError) {
        toast.error('Erreur lors de la création de la story', { id: 'story-upload' });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);

      // Small delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success(mediaType === 'video' ? '🎥 Vidéo story publiée !' : '📸 Photo story publiée !', { id: 'story-upload' });
      fetchStories();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const markStoryAsViewed = async (storyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('story_views')
      .insert({
        story_id: storyId,
        viewer_id: user.id
      });
  };

  const deleteStory = async (storyId: string) => {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Story supprimée');
    fetchStories();
  };

  return {
    storyGroups,
    loading,
    createStory,
    markStoryAsViewed,
    deleteStory,
    refetch: fetchStories,
    uploadProgress,
    isUploading
  };
};
