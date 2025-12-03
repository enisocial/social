import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Camera, MapPin, Tag, Star, CheckCircle, AlertCircle, Info, Package, DollarSign, FileText, ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CATEGORIES = [
  "Électronique",
  "Vêtements",
  "Maison",
  "Sports",
  "Livres",
  "Véhicules",
  "Divertissement",
  "Famille",
  "Loisirs",
  "Autre",
];

const CONDITIONS = [
  { value: "new", label: "Neuf", description: "Jamais utilisé, dans son emballage d'origine", color: "bg-green-500" },
  { value: "like-new", label: "Comme neuf", description: "Utilisé très peu de fois, impeccable", color: "bg-blue-500" },
  { value: "good", label: "Bon état", description: "Quelques signes d'usure normale", color: "bg-yellow-500" },
  { value: "fair", label: "État correct", description: "Usé mais encore fonctionnel", color: "bg-orange-500" },
];

const SellProduct = () => {
  const navigate = useNavigate();
  const { createProduct } = useMarketplace();
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("basics");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "good",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      alert("Veuillez ajouter au moins une photo");
      return;
    }

    try {
      await createProduct.mutateAsync({
        ...formData,
        price: parseFloat(formData.price),
        images,
      });
      navigate("/marketplace");
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate form completion progress
  const getFormProgress = () => {
    const fields = ['title', 'description', 'price', 'category', 'condition'];
    const filledFields = fields.filter(field => formData[field as keyof typeof formData]?.toString().trim());
    const hasImages = images.length > 0;
    const totalSteps = fields.length + 1; // +1 for images
    const completedSteps = filledFields.length + (hasImages ? 1 : 0);
    return (completedSteps / totalSteps) * 100;
  };

  const isFormValid = () => {
    return formData.title.trim() &&
           formData.description.trim() &&
           formData.price &&
           formData.category &&
           images.length > 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-8 mb-8 border border-white/50 dark:border-gray-800/50">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-200/30 to-purple-200/30 rounded-full blur-3xl -translate-y-40 translate-x-40"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-200/30 to-rose-200/30 rounded-full blur-3xl translate-y-32 -translate-x-32"></div>

          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                <Package className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Créer une annonce
                </h1>
                <p className="text-xl text-muted-foreground mt-1">
                  Vendez vos articles en quelques étapes simples
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Progression de l'annonce</h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {Math.round(getFormProgress())}% complété
                </span>
              </div>
              <Progress value={getFormProgress()} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Informations de base</span>
                <span>Détails du produit</span>
                <span>Photos & Localisation</span>
                <span>Finalisation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/marketplace")}
            className="gap-2 hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Marketplace
          </Button>
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="basics" className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Informations</span>
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Détails</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Photos</span>
                </TabsTrigger>
                <TabsTrigger value="location" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Localisation</span>
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                {/* Basics Tab */}
                <TabsContent value="basics" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                          <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        Informations de base
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Commencez par donner un titre accrocheur à votre annonce
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="title" className="text-base font-medium flex items-center gap-2">
                          Titre de l'annonce *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Choisissez un titre descriptif et accrocheur</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="title"
                          placeholder="Ex: iPhone 15 Pro Max 256GB - État neuf"
                          value={formData.title}
                          onChange={(e) => handleChange("title", e.target.value)}
                          className="text-base h-12"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.title.length}/100 caractères
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="description" className="text-base font-medium flex items-center gap-2">
                          Description détaillée *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Décrivez l'état, les caractéristiques et les raisons de vendre</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez votre article en détail : état, caractéristiques, raisons de la vente..."
                          value={formData.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={6}
                          className="text-base resize-none"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.description.length}/2000 caractères
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => setActiveTab("details")}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                          Suivant: Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        Détails du produit
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Précisez la catégorie, l'état et le prix de votre article
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="category" className="text-base font-medium">
                            Catégorie *
                          </Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => handleChange("category", value)}
                            required
                          >
                            <SelectTrigger id="category" className="h-12">
                              <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat} className="py-3">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium">
                            État du produit *
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            {CONDITIONS.map((cond) => (
                              <div
                                key={cond.value}
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                  formData.condition === cond.value
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                }`}
                                onClick={() => handleChange("condition", cond.value)}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-3 h-3 rounded-full ${cond.color}`}></div>
                                  <span className="font-medium text-sm">{cond.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-tight">
                                  {cond.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="price" className="text-base font-medium flex items-center gap-2">
                          Prix *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Fixez un prix attractif pour maximiser les vues</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => handleChange("price", e.target.value)}
                            className="pl-12 pr-8 text-base h-12"
                            required
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            €
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Prix suggéré: ~{(parseFloat(formData.price || '0') * 0.9).toFixed(2)}€
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab("basics")}
                        >
                          Précédent
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setActiveTab("media")}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          Suivant: Photos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                          <Camera className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        Photos du produit
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez des photos de qualité pour attirer plus d'acheteurs
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Photos du produit *
                          <span className="text-sm text-muted-foreground ml-2">
                            ({images.length}/10 photos)
                          </span>
                        </Label>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <ImageUploader images={images} onImagesChange={setImages} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                              <img
                                src={image}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {images.length === 0 && (
                            <div className="col-span-full text-center py-8">
                              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">Aucune photo ajoutée</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Conseils pour de meilleures photos
                              </h4>
                              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Utilisez un bon éclairage naturel</li>
                                <li>• Montrez l'article sous plusieurs angles</li>
                                <li>• Incluez des photos avec et sans emballage</li>
                                <li>• Évitez les filtres ou modifications</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab("details")}
                        >
                          Précédent
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setActiveTab("location")}
                          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                          disabled={images.length === 0}
                        >
                          Suivant: Localisation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                          <MapPin className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        Localisation & Finalisation
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Indiquez où les acheteurs peuvent récupérer l'article
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="location" className="text-base font-medium flex items-center gap-2">
                          Lieu de retrait
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Précisez la ville ou le quartier pour faciliter la rencontre</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500" />
                          <Input
                            id="location"
                            placeholder="Ex: Paris 15ème, Marseille centre..."
                            value={formData.location}
                            onChange={(e) => handleChange("location", e.target.value)}
                            className="pl-12 text-base h-12"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cette information aide les acheteurs locaux à vous contacter
                        </p>
                      </div>

                      {/* Form Summary */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <h3 className="font-semibold text-green-900 dark:text-green-100">
                            Prêt à publier !
                          </h3>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Titre:</span>
                            <span className="font-medium">{formData.title || 'Non défini'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prix:</span>
                            <span className="font-medium text-green-600">
                              {formData.price ? `${formData.price}€` : 'Non défini'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Catégorie:</span>
                            <span className="font-medium">{formData.category || 'Non définie'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Photos:</span>
                            <span className="font-medium">{images.length} ajoutée(s)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab("media")}
                        >
                          Précédent
                        </Button>
                        <Button
                          type="submit"
                          size="lg"
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-3"
                          disabled={!isFormValid() || createProduct.isPending}
                        >
                          {createProduct.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                              Publication en cours...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              Publier l'annonce
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </form>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tips Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Conseils pour réussir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Titre accrocheur</h4>
                      <p className="text-xs text-muted-foreground">Mentionnez la marque et l'état</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-green-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Prix compétitif</h4>
                      <p className="text-xs text-muted-foreground">Comparez avec le marché</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-purple-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Photos de qualité</h4>
                      <p className="text-xs text-muted-foreground">6+ photos sous différents angles</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-orange-600">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Description complète</h4>
                      <p className="text-xs text-muted-foreground">Tous les détails importants</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Aperçu de l'annonce</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {images.length > 0 ? (
                      <img
                        src={images[0]}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-lg">
                      {formData.price ? `${formData.price}€` : 'Prix'}
                    </p>
                    <h3 className="font-medium text-sm line-clamp-2">
                      {formData.title || 'Titre de l\'annonce'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.location || 'Localisation'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellProduct;
