import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface GiftType {
  id: string;
  name: string;
  icon: string;
  value: number;
  animation_type: string;
  rarity: string;
}

export interface LiveGift {
  id: string;
  stream_id: string;
  sender_id: string;
  gift_type_id: string;
  quantity: number;
  total_value: number;
  created_at: string;
  sender: {
    name: string;
    avatar_url?: string;
  };
  gift_type: GiftType;
}

export const useLiveGifts = (streamId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gift types
  const { data: giftTypes } = useQuery({
    queryKey: ['gift-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .order('value', { ascending: true });

      if (error) throw error;
      return data as GiftType[];
    },
  });

  // Fetch gifts for stream
  const { data: gifts } = useQuery({
    queryKey: ['live-gifts', streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_gifts')
        .select(`
          *,
          sender:sender_id(name, avatar_url),
          gift_type:gift_type_id(*)
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as LiveGift[];
    },
  });

  // Subscribe to new gifts
  useEffect(() => {
    const channel = supabase
      .channel(`live-gifts-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-gifts', streamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  // Send gift mutation
  const sendGift = useMutation({
    mutationFn: async ({ giftTypeId, quantity = 1 }: { giftTypeId: string; quantity?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const giftType = giftTypes?.find(g => g.id === giftTypeId);
      if (!giftType) throw new Error("Gift type not found");

      const { data, error } = await supabase
        .from('live_gifts')
        .insert({
          stream_id: streamId,
          sender_id: user.id,
          gift_type_id: giftTypeId,
          quantity,
          total_value: giftType.value * quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-gifts', streamId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le cadeau",
        variant: "destructive",
      });
    },
  });

  return {
    giftTypes,
    gifts,
    sendGift,
  };
};
