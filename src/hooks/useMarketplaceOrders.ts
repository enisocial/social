import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketplaceOrder {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  quantity: number;
  total_price: number;
  message: string | null;
  created_at: string;
  updated_at: string;
  marketplace_products: {
    title: string;
    price: number;
    images: string[];
  };
  buyer: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  seller: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useMarketplaceOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketplace-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marketplace_orders")
        .select(`
          *,
          marketplace_products:product_id (
            title,
            price,
            images
          ),
          buyer:profiles!buyer_id (
            id,
            name,
            username,
            avatar_url
          ),
          seller:profiles!seller_id (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MarketplaceOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: {
      product_id: string;
      seller_id: string;
      quantity: number;
      total_price: number;
      message?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_marketplace_order_rpc', {
        p_product_id: order.product_id,
        p_seller_id: order.seller_id,
        p_quantity: order.quantity,
        p_total_price: order.total_price,
        p_message: order.message || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      toast.success("Commande créée avec succès");
    },
    onError: (error: any) => {
      console.error("Error creating order:", error);
      toast.error(error.message || "Erreur lors de la création de la commande");
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      toast.success("Statut mis à jour");
    },
    onError: (error) => {
      console.error("Error updating order:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  return {
    orders,
    isLoading,
    createOrder,
    updateOrderStatus,
  };
};
