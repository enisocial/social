import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PhotoTag {
  id: string;
  photo_id: string;
  tagged_user_id: string;
  tagged_by: string;
  position_x?: number;
  position_y?: number;
  created_at: string;
  profiles: {
    username: string;
    name: string;
    avatar_url?: string;
  };
}

export const usePhotoTags = (photoId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery({
    queryKey: ['photo-tags', photoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_tags')
        .select(`
          *,
          profiles!photo_tags_tagged_user_id_fkey (username, name, avatar_url)
        `)
        .eq('photo_id', photoId);

      if (error) throw error;
      return data as PhotoTag[];
    },
    enabled: !!photoId,
  });

  const tagUser = useMutation({
    mutationFn: async (tag: {
      tagged_user_id: string;
      position_x?: number;
      position_y?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('photo_tags')
        .insert({
          photo_id: photoId,
          tagged_by: user.id,
          ...tag,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags', photoId] });
      toast({
        title: "Ami tagué",
        description: "L'ami a été tagué sur la photo",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de taguer l'ami",
        variant: "destructive",
      });
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-tags', photoId] });
      toast({
        title: "Tag supprimé",
        description: "Le tag a été supprimé",
      });
    },
  });

  return {
    tags,
    isLoading,
    tagUser,
    removeTag,
  };
};
