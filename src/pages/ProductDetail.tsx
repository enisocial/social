import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useProduct } from "@/hooks/useMarketplace";
import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, MapPin, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, isLoading } = useProduct(id!);
  const { createOrder } = useMarketplaceOrders();
  const { createConversation } = useConversations();
  const [orderMessage, setOrderMessage] = useState("");
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const handleContactSeller = async () => {
    if (!product) return;
    
    try {
      const conversationId = await createConversation(product.user_id);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erreur lors de la création de la conversation");
    }
  };

  const handlePlaceOrder = async () => {
    if (!product) return;

    try {
      await createOrder.mutateAsync({
        product_id: product.id,
        seller_id: product.user_id,
        quantity: 1,
        total_price: product.price,
        message: orderMessage,
      });
      setIsOrderDialogOpen(false);
      setOrderMessage("");
      toast.success("Le vendeur a été notifié de votre intérêt");
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full mb-6" />
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <Button onClick={() => navigate("/marketplace")}>
            Retour au marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/marketplace")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-96 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-96 bg-muted flex items-center justify-center rounded-lg">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
            </div>

            <p className="text-4xl font-bold text-primary mb-6">{product.price} €</p>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={product.profiles.avatar_url || undefined} />
                    <AvatarFallback>{product.profiles.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{product.profiles.name}</p>
                    <p className="text-sm text-muted-foreground">@{product.profiles.username}</p>
                  </div>
                </div>
                <Button
                  onClick={handleContactSeller}
                  variant="outline"
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contacter le vendeur
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description || "Aucune description"}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">État</h3>
                <p className="text-muted-foreground capitalize">{product.condition}</p>
              </div>

              {product.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{product.location}</span>
                </div>
              )}
            </div>

            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full">
                  Je suis intéressé(e)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exprimer votre intérêt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Le vendeur sera notifié et pourra vous contacter par message.
                  </p>
                  <Textarea
                    placeholder="Message optionnel pour le vendeur..."
                    value={orderMessage}
                    onChange={(e) => setOrderMessage(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handlePlaceOrder} className="w-full">
                    Envoyer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
