import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PhotoAlbum {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_photo_url?: string;
  privacy: 'public' | 'friends' | 'private';
  created_at: string;
  updated_at: string;
  system_album?: string | null;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const usePhotoAlbums = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: albums, isLoading } = useQuery({
    queryKey: ['photo-albums', userId],
    queryFn: async () => {
      let query = supabase
        .from('photo_albums')
        .select(`
          *,
          profiles:user_id (username, name, avatar_url)
        `);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as PhotoAlbum[];
    },
  });

  const createAlbum = useMutation({
    mutationFn: async (album: {
      name: string;
      description?: string;
      privacy?: 'public' | 'friends' | 'private';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('photo_albums')
        .insert({
          ...album,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-albums'] });
      toast({
        title: "Album créé",
        description: "Votre album a été créé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'album",
        variant: "destructive",
      });
    },
  });

  const updateAlbum = useMutation({
    mutationFn: async ({ albumId, updates }: {
      albumId: string;
      updates: Partial<PhotoAlbum>;
    }) => {
      const { error } = await supabase
        .from('photo_albums')
        .update(updates)
        .eq('id', albumId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-albums'] });
      toast({
        title: "Album mis à jour",
        description: "L'album a été mis à jour",
      });
    },
  });

  const deleteAlbum = useMutation({
    mutationFn: async (albumId: string) => {
      // Check if it's a system album
      const { data: album } = await supabase
        .from('photo_albums')
        .select('system_album')
        .eq('id', albumId)
        .single();

      if (album?.system_album) {
        throw new Error("Les albums système ne peuvent pas être supprimés");
      }

      const { error } = await supabase
        .from('photo_albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-albums'] });
      toast({
        title: "Album supprimé",
        description: "L'album a été supprimé",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'album",
        variant: "destructive",
      });
    },
  });

  return {
    albums,
    isLoading,
    createAlbum,
    updateAlbum,
    deleteAlbum,
  };
};
