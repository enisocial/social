import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Photo {
  id: string;
  album_id?: string;
  user_id: string;
  image_url: string;
  caption?: string;
  location?: string;
  privacy: 'public' | 'friends' | 'private';
  created_at: string;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const usePhotos = (albumId?: string, userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['photos', albumId, userId],
    queryFn: async () => {
      let query = supabase
        .from('photos')
        .select(`
          *,
          profiles:user_id (username, name, avatar_url)
        `);

      if (albumId) {
        query = query.eq('album_id', albumId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Photo[];
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: async (photo: {
      image_url: string;
      album_id?: string;
      caption?: string;
      location?: string;
      privacy?: 'public' | 'friends' | 'private';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('photos')
        .insert({
          ...photo,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast({
        title: "Photo ajoutée",
        description: "Votre photo a été ajoutée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la photo",
        variant: "destructive",
      });
    },
  });

  const updatePhoto = useMutation({
    mutationFn: async ({ photoId, updates }: {
      photoId: string;
      updates: Partial<Photo>;
    }) => {
      const { error } = await supabase
        .from('photos')
        .update(updates)
        .eq('id', photoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée",
      });
    },
  });

  return {
    photos,
    isLoading,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
  };
};
