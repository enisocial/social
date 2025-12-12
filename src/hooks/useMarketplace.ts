import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketplaceProduct {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[];
  category: string;
  condition: string;
  status: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useMarketplace = (category?: string) => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["marketplace-products", category],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_products")
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MarketplaceProduct[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: {
      title: string;
      description: string;
      price: number;
      category: string;
      condition: string;
      location?: string;
      images?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marketplace_products")
        .insert({
          ...product,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      toast.success("Produit créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("marketplace_products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      toast.success("Produit mis à jour");
    },
    onError: (error) => {
      console.error("Error updating product:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketplace_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      toast.success("Produit supprimé");
    },
    onError: (error) => {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

export const useMyProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marketplace_products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return { products, isLoading };
};

export const useProduct = (productId: string) => {
  const { data: product, isLoading } = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_products")
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .eq("id", productId)
        .single();

      if (error) throw error;
      return data as MarketplaceProduct;
    },
  });

  return { product, isLoading };
};
