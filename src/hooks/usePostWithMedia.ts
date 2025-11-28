import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_BUCKET = 'posts-media'; // adapter si nécessaire
const SIGNED_URL_TTL = 60 * 60; // 1h

async function resolveMediaUrls(items: any[]) {
  return Promise.all(
    (items || []).map(async (m) => {
      // champs attendus : path (chemin dans le bucket), bucket (optionnel), url/public_url (optionnel)
      const bucket = m.bucket || DEFAULT_BUCKET;
      if (m.url || m.public_url) return { ...m, url: m.url ?? m.public_url };
      if (!m.path) return { ...m, url: undefined };

      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(m.path, SIGNED_URL_TTL);
        if (!error && data?.signedUrl) return { ...m, url: data.signedUrl };
        // older supabase SDK uses signedUrl
        if (!error && data?.signedUrl) return { ...m, url: data.signedUrl };
      } catch (e) {
        // silence, on renverra quand même l'item sans url
      }
      return { ...m, url: undefined };
    })
  );
}

export const usePostWithMedia = (postId?: string) => {
  // Fetch post media (avec resolution des URLs pour storage privé)
  const {
    data: postMedia,
    isLoading: postMediaLoading,
    isError: postMediaError,
    error: postMediaErrorObj,
  } = useQuery({
    queryKey: ['post-media', postId],
    enabled: !!postId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_media')
        .select('*')
        .eq('post_id', postId)
        .order('order_index');

      if (error) throw error;
      const items = data || [];
      const resolved = await resolveMediaUrls(items);
      return resolved;
    },
  });

  // Fetch post tags
  const {
    data: postTags,
    isLoading: postTagsLoading,
    isError: postTagsError,
    error: postTagsErrorObj,
  } = useQuery({
    queryKey: ['post-tags', postId],
    enabled: !!postId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username, avatar_url)
        `)
        .eq('post_id', postId);

      if (error) throw error;
      return data || [];
    },
  });

  return {
    postMedia,
    postMediaLoading,
    postMediaError,
    postMediaErrorObj,
    postTags,
    postTagsLoading,
    postTagsError,
    postTagsErrorObj,
  };
};
