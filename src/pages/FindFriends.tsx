import { useAuth } from '@/hooks/useAuth';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useMessenger } from '@/contexts/MessengerContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  MapPin,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
  Home,
  MessageSquare,
  Sparkles,
  Heart,
  Globe,
  ArrowLeft,
  Search,
  Filter,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';

export default function FindFriends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { openBubble } = useMessenger();
  const { suggestions, loading: suggestionsLoading } = useSmartFriendSuggestions(user?.id, 50);
  const {
    receivedRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriendshipStatus,
    loading: requestsLoading,
  } = useFriendRequests(user?.id);

  // Statistiques pour la navigation
  const stats = { total: 0 }; // Placeholder, peut être étendu si nécessaire

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || suggestionsLoading || requestsLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* HEADER ULTRA-MODERNE AFRICAIN */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        {/* Fond avec motifs africains subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-teal-500/5 to-cyan-500/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            {/* ICÔNE PRINCIPALE */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* TITRE PRINCIPAL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Découvrir des amis
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🌍 Étendez votre réseau panafricain et connectez-vous avec des personnes partageant vos passions
              </p>
            </motion.div>

            {/* STATISTIQUES RAPIDES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 mt-8"
            >
              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-200/50">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {suggestions.length} suggestions intelligentes
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-teal-200/50">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {receivedRequests.length} demandes reçues
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-cyan-200/50">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {sentRequests.filter(r => r.status === 'pending').length} demandes envoyées
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* BARRE DE NAVIGATION MODERNE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap gap-4 mb-8 justify-center"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/feed')}
            className="gap-2 border-emerald-200/50 hover:bg-emerald-50 dark:border-emerald-800/50 dark:hover:bg-emerald-950/50 rounded-full px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/friends')}
            className="gap-2 border-teal-200/50 hover:bg-teal-50 dark:border-teal-800/50 dark:hover:bg-teal-950/50 rounded-full px-6 py-3"
          >
            <Heart className="w-4 h-4" />
            Mes amis ({stats?.total || 0})
          </Button>
        </motion.div>

        {/* ONGLETS ULTRA-MODERNES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Tabs defaultValue="suggestions" className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2 shadow-xl">
                <TabsTrigger
                  value="suggestions"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">Suggestions</span>
                  </div>
                  {suggestions.length > 0 && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 ml-2">
                      {suggestions.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="received"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    <span className="font-semibold">Reçues</span>
                  </div>
                  {receivedRequests.length > 0 && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ml-2 animate-pulse">
                      {receivedRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="sent"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    <span className="font-semibold">Envoyées</span>
                  </div>
                  {sentRequests.filter(r => r.status === 'pending').length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ml-2">
                      {sentRequests.filter(r => r.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card className="p-8 text-center">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Aucune suggestion d'ami disponible pour le moment
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ajoutez votre localisation dans les paramètres pour recevoir des suggestions
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((suggestion) => {
                const status = getFriendshipStatus(suggestion.id);
                
                return (
                  <Card key={suggestion.id} className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar
                        className="w-20 h-20 border-4 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => openBubble(null, suggestion)}
                      >
                        <AvatarImage src={suggestion.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {suggestion.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 w-full">
                        <Link to={`/profile/${suggestion.username}`}>
                          <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                            {suggestion.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          @{suggestion.username}
                        </p>

                        {/* Bouton Voir profil séparé */}
                        <Link to={`/profile/${suggestion.username}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Voir le profil
                          </Button>
                        </Link>

                        {(suggestion.city || suggestion.region || suggestion.country) && (
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {[suggestion.city, suggestion.region, suggestion.country]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}

                        {suggestion.mutual_friends_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? 's' : ''} en commun
                          </Badge>
                        )}

                        {suggestion.same_location && (
                          <Badge variant="outline" className="text-xs">
                            Même région
                          </Badge>
                        )}

                        {suggestion.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {suggestion.bio}
                          </p>
                        )}
                      </div>

                      {status === 'none' && (
                        <Button
                          onClick={() => sendFriendRequest(suggestion.id)}
                          className="w-full"
                          size="sm"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Ajouter
                        </Button>
                      )}

                      {status === 'pending_sent' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <Clock className="w-4 h-4 mr-2" />
                          Demande envoyée
                        </Button>
                      )}

                      <div className="flex gap-2 w-full">
                        {status === 'none' && (
                          <Button
                            onClick={() => sendFriendRequest(suggestion.id)}
                            className="flex-1"
                            size="sm"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                        )}

                        {status === 'pending_sent' && (
                          <Button variant="outline" size="sm" className="flex-1" disabled>
                            <Clock className="w-4 h-4 mr-2" />
                            Demande envoyée
                          </Button>
                        )}

                        {status === 'friends' && (
                          <>
                            <Button
                              onClick={() => openBubble(null, suggestion)}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1" disabled>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Amis
                            </Button>
                          </>
                        )}

                        {(status === 'none' || status === 'pending_sent') && (
                          <Button
                            onClick={() => openBubble(null, suggestion)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {receivedRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Aucune demande d'ami en attente
              </p>
            </Card>
          ) : (
            receivedRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar
                    className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => openBubble(null, request.sender)}
                  >
                    <AvatarImage src={request.sender?.avatar_url || ''} />
                    <AvatarFallback>
                      {request.sender?.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <Link to={`/profile/${request.sender?.username}`}>
                      <p className="font-semibold hover:text-primary transition-colors cursor-pointer">
                        {request.sender?.name}
                      </p>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      @{request.sender?.username}
                    </p>
                    <Link to={`/profile/${request.sender?.username}`}>
                      <Button variant="ghost" size="sm" className="text-xs mt-1">
                        Voir le profil
                      </Button>
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptFriendRequest(request.id)}
                      size="sm"
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accepter
                    </Button>
                    <Button
                      onClick={() => rejectFriendRequest(request.id)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentRequests.filter(r => r.status === 'pending').length === 0 ? (
            <Card className="p-8 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Aucune demande envoyée en attente
              </p>
            </Card>
          ) : (
            sentRequests
              .filter(r => r.status === 'pending')
              .map((request) => (
                <Card key={request.id} className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar
                      className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => openBubble(null, request.receiver)}
                    >
                      <AvatarImage src={request.receiver?.avatar_url || ''} />
                      <AvatarFallback>
                        {request.receiver?.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <Link to={`/profile/${request.receiver?.username}`}>
                        <p className="font-semibold hover:text-primary transition-colors cursor-pointer">
                          {request.receiver?.name}
                        </p>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        @{request.receiver?.username}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Envoyée le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <Link to={`/profile/${request.receiver?.username}`}>
                        <Button variant="ghost" size="sm" className="text-xs mt-1">
                          Voir le profil
                        </Button>
                      </Link>
                    </div>

                    <Button
                      onClick={() => cancelFriendRequest(request.id)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </Button>
                  </div>
                </Card>
              ))
          )}
        </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
