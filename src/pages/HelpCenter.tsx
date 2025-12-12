import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HelpCircle,
  Search,
  MessageSquare,
  BookOpen,
  Settings,
  Users,
  Camera,
  Video,
  Shield,
  ArrowLeft,
  Send,
  Mail,
  Phone,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Démarrage',
      icon: HelpCircle,
      color: 'from-blue-500 to-indigo-500',
      articles: [
        { title: 'Créer un compte', content: 'Apprenez à créer votre compte en quelques étapes simples.' },
        { title: 'Modifier votre profil', content: 'Personnalisez votre profil avec photo, bio et informations.' },
        { title: 'Ajouter des amis', content: 'Découvrez comment connecter avec vos amis et votre réseau.' }
      ]
    },
    {
      id: 'posts-media',
      title: 'Publications & Médias',
      icon: Camera,
      color: 'from-green-500 to-teal-500',
      articles: [
        { title: 'Créer une publication', content: 'Partagez vos pensées, photos et vidéos avec votre communauté.' },
        { title: 'Ajouter des photos', content: 'Téléchargez et partagez vos plus belles photos.' },
        { title: 'Publier des vidéos', content: 'Apprenez à partager vos vidéos en haute qualité.' }
      ]
    },
    {
      id: 'social-features',
      title: 'Fonctionnalités sociales',
      icon: Users,
      color: 'from-purple-500 to-indigo-500',
      articles: [
        { title: 'Gérer ses amis', content: 'Accepter, refuser ou supprimer des demandes d\'ami.' },
        { title: 'Créer des groupes', content: 'Formez des communautés autour de vos intérêts.' },
        { title: 'Utiliser les stories', content: 'Partagez des moments éphémères avec vos amis.' }
      ]
    },
    {
      id: 'privacy-security',
      title: 'Confidentialité & Sécurité',
      icon: Shield,
      color: 'from-red-500 to-pink-500',
      articles: [
        { title: 'Paramètres de confidentialité', content: 'Contrôlez qui peut voir vos publications et informations.' },
        { title: 'Sécurité du compte', content: 'Protégez votre compte avec des mots de passe forts.' },
        { title: 'Signaler du contenu', content: 'Apprenez à signaler du contenu inapproprié.' }
      ]
    }
  ];

  const popularArticles = [
    { title: 'Comment modifier mon profil ?', views: 1250 },
    { title: 'Ajouter et gérer des amis', views: 980 },
    { title: 'Créer et partager des publications', views: 1540 },
    { title: 'Paramètres de confidentialité', views: 890 },
    { title: 'Signaler un problème ou un abus', views: 675 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/10 dark:to-indigo-950/20">
      <Navbar />

      {/* HEADER ULTRA-MODERNE */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/8 to-pink-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <HelpCircle className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Centre d'Aide
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🆘 Trouvez des réponses à toutes vos questions et obtenez de l'aide personnalisée
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* BARRE DE NAVIGATION */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 gap-3 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </Button>
          </div>

          <Tabs defaultValue="browse" className="space-y-8">
            <TabsList className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2 shadow-xl grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger
                value="browse"
                className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden sm:inline">Parcourir</span>
              </TabsTrigger>
              <TabsTrigger
                value="search"
                className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Rechercher</span>
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
            </TabsList>

            {/* ONGLET PARCOURIR */}
            <TabsContent value="browse">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {helpCategories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                      <CardHeader className="text-center pb-4">
                        <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <category.icon className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-200">
                          {category.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {category.articles.map((article, articleIndex) => (
                            <div key={articleIndex} className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">
                                {article.title}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {article.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ARTICLES POPULAIRES */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-12"
              >
                <Card className="bg-gradient-to-br from-amber-50/80 via-orange-50/80 to-red-50/80 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      Articles populaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {popularArticles.map((article, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                              {article.title}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              {article.views} vues
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ONGLET RECHERCHER */}
            <TabsContent value="search">
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    Rechercher dans l'aide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Tapez votre question ou mot-clé..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-14 text-lg border-2 border-gray-200 dark:border-gray-700 focus:border-green-400 rounded-2xl"
                    />
                  </div>

                  {searchQuery && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Résultats pour "{searchQuery}"
                      </h3>
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Comment modifier mon profil ?
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Apprenez à personnaliser votre profil avec photo, bio et informations personnelles.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ONGLET CONTACT */}
            <TabsContent value="contact">
              <div className="grid gap-8 md:grid-cols-2">
                {/* FORMULAIRE DE CONTACT */}
                <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      Contactez-nous
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Sujet
                        </label>
                        <Input
                          placeholder="Décrivez brièvement votre problème"
                          className="h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Message
                        </label>
                        <Textarea
                          placeholder="Décrivez votre problème en détail..."
                          rows={6}
                          className="border-2 border-gray-200 dark:border-gray-700 focus:border-purple-400 rounded-xl resize-none"
                        />
                      </div>
                    </div>

                    <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl">
                      <Send className="w-5 h-5 mr-2" />
                      Envoyer le message
                    </Button>
                  </CardContent>
                </Card>

                {/* INFOS DE CONTACT */}
                <div className="space-y-6">
                  <Card className="bg-gradient-to-br from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        Email
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        Pour les demandes générales et le support technique :
                      </p>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        support@s-ocial.com
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50/80 via-orange-50/80 to-red-50/80 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 backdrop-blur-sm border border-amber-200/50 dark:border-amber-800/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        Temps de réponse
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">24-48h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Formulaire de contact</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">24-72h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
