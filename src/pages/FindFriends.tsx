import { useAuth } from '@/hooks/useAuth';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, MapPin, UserCheck, UserX, Clock, Check, X, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FindFriends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
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
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4 flex gap-2">
        <Button variant="ghost" onClick={() => navigate('/feed')} className="gap-2">
          <Home className="h-4 w-4" />
          Accueil
        </Button>
        <Button variant="ghost" onClick={() => navigate('/friends')} className="gap-2">
          <Users className="h-4 w-4" />
          Mes amis
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Users className="w-8 h-8" />
        Trouver des amis
      </h1>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <Clock className="w-4 h-4" />
            Reçues
            {receivedRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {receivedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Envoyées
            {sentRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sentRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

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
                      <Link to={`/profile/${suggestion.username}`}>
                        <Avatar className="w-20 h-20 border-4 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                          <AvatarImage src={suggestion.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {suggestion.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="space-y-1 w-full">
                        <Link to={`/profile/${suggestion.username}`}>
                          <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                            {suggestion.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          @{suggestion.username}
                        </p>

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

                      {status === 'friends' && (
                        <Button variant="secondary" size="sm" className="w-full" disabled>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Amis
                        </Button>
                      )}
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
                  <Link to={`/profile/${request.sender?.username}`}>
                    <Avatar className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                      <AvatarImage src={request.sender?.avatar_url || ''} />
                      <AvatarFallback>
                        {request.sender?.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1">
                    <Link to={`/profile/${request.sender?.username}`}>
                      <p className="font-semibold hover:text-primary transition-colors cursor-pointer">
                        {request.sender?.name}
                      </p>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      @{request.sender?.username}
                    </p>
                    {(request.sender?.city || request.sender?.region) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {[request.sender?.city, request.sender?.region]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
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
                    <Link to={`/profile/${request.receiver?.username}`}>
                      <Avatar className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                        <AvatarImage src={request.receiver?.avatar_url || ''} />
                        <AvatarFallback>
                          {request.receiver?.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

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
    </div>
  );
}
