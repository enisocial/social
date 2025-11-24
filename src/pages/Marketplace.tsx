import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MapPin, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const CATEGORIES = [
  { value: "Tous", label: "Tous", icon: "🏪" },
  { value: "Électronique", label: "Électronique", icon: "💻" },
  { value: "Vêtements", label: "Vêtements", icon: "👕" },
  { value: "Maison", label: "Maison", icon: "🏠" },
  { value: "Sports", label: "Sports", icon: "⚽" },
  { value: "Livres", label: "Livres", icon: "📚" },
  { value: "Véhicules", label: "Véhicules", icon: "🚗" },
  { value: "Divertissement", label: "Divertissement", icon: "🎮" },
  { value: "Famille", label: "Famille", icon: "👶" },
  { value: "Loisirs", label: "Loisirs", icon: "🎨" },
  { value: "Autre", label: "Autre", icon: "📦" },
];

const Marketplace = () => {
  const [category, setCategory] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const { products, isLoading } = useMarketplace(category === "Tous" ? undefined : category);
  const navigate = useNavigate();

  const filteredProducts = products?.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <Button onClick={() => navigate("/marketplace/sell")} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Créer une annonce
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher sur Marketplace"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                onClick={() => setCategory(cat.value)}
                className="flex-shrink-0 gap-2"
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-6 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group"
                onClick={() => navigate(`/marketplace/product/${product.id}`)}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Tag className="h-12 w-12" />
                    </div>
                  )}
                  {product.condition === 'new' && (
                    <Badge className="absolute top-2 left-2 bg-green-500">
                      Neuf
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="font-semibold text-lg text-primary">
                    {formatPrice(product.price)}
                  </p>
                  <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                    {product.title}
                  </h3>
                  {product.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{product.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={product.profiles.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {product.profiles.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">
                      {product.profiles.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun article trouvé</h3>
            <p className="text-muted-foreground mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <Button onClick={() => navigate("/marketplace/sell")}>
              <Plus className="h-4 w-4 mr-2" />
              Créer votre première annonce
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
