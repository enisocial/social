import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MapPin, Tag, ShoppingBag, TrendingUp, Sparkles, Store, Filter, Heart, Star } from "lucide-react";
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 p-8 mb-8 border border-white/50 dark:border-gray-800/50">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl -translate-y-40 translate-x-40"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl translate-y-32 -translate-x-32"></div>

          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                    <ShoppingBag className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Marketplace
                    </h1>
                    <p className="text-xl text-muted-foreground mt-2">
                      Achetez et vendez localement avec confiance
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
                    <Store className="h-5 w-5 text-emerald-500" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Articles Disponibles</div>
                      <div className="text-xs text-muted-foreground">Découvrez des trésors locaux</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Transactions Sécurisées</div>
                      <div className="text-xs text-muted-foreground">Paiements protégés</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/70 dark:bg-gray-800/70 rounded-2xl border border-white/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Communauté Active</div>
                      <div className="text-xs text-muted-foreground">Rejoignez des milliers d'utilisateurs</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => navigate("/marketplace/sell")}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 gap-3"
                >
                  <Plus className="h-5 w-5" />
                  Créer une annonce
                </Button>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredProducts?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Articles disponibles
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Search */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl shadow-lg">
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  <Search className="h-6 w-6 text-emerald-500" />
                </div>
                <Input
                  placeholder="Rechercher des articles, catégories, vendeurs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-16 pr-6 py-6 text-lg border-0 bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtres
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                onClick={() => setCategory(cat.value)}
                className={`flex-shrink-0 gap-3 px-6 py-3 rounded-2xl transition-all duration-200 ${
                  category === cat.value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                    : 'hover:bg-white/50 dark:hover:bg-gray-800/50 backdrop-blur-sm'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium">{cat.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <Skeleton className="aspect-square w-full rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group relative overflow-hidden border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/marketplace/product/${product.id}`)}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg z-10" />

                {/* Favorite button */}
                <button className="absolute top-3 right-3 z-20 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-gray-800">
                  <Heart className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="relative aspect-square overflow-hidden bg-muted rounded-t-lg">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                      <Tag className="h-16 w-16" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {product.condition === 'new' && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm">
                        Neuf
                      </Badge>
                    )}
                    {product.condition === 'used' && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 shadow-sm">
                        Occasion
                      </Badge>
                    )}
                  </div>

                  {/* Multiple images indicator */}
                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs font-medium">
                      +{product.images.length - 1}
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
                      {formatPrice(product.price)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-2 leading-tight min-h-[2.5rem] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {product.title}
                  </h3>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {product.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      <span className="truncate">{product.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-700">
                        <AvatarImage src={product.profiles.avatar_url || ""} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                          {product.profiles.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {product.profiles.name}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(product.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 mb-6">
              <Search className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
              Aucun article trouvé
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Essayez de modifier vos critères de recherche ou explorez d'autres catégories
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/marketplace/sell")} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer votre première annonce
              </Button>
              <Button variant="outline" onClick={() => setCategory("Tous")} className="gap-2">
                <Store className="h-4 w-4" />
                Voir tous les articles
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
