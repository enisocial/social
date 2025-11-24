import { useAuth } from '@/hooks/useAuth';
import { usePaginatedFriends } from '@/hooks/usePaginatedFriends';
import { useOptimizedFriendRequests } from '@/hooks/useOptimizedFriendRequests';
import { useConversations } from '@/hooks/useConversations';
import { useState, useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  MapPin, 
  Heart, 
  MessageCircle, 
  Calendar,
  Filter,
  Grid,
  List,
  UserMinus,
  ArrowUpDown,
  Home
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'recent' | 'location';

export default function Friends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { removeFriend } = useOptimizedFriendRequests();
  const { createConversation } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  
  // Paginated friends with infinite scroll
  const { 
    friends, 
    isLoading: friendsLoading, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = usePaginatedFriends(user?.id, searchQuery, locationFilter);
  
  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Get unique locations from friends
  const locations = useMemo(() => {
    const locs = new Set<string>();
    friends.forEach(friend => {
      const profile = friend.sender_id === user?.id ? friend.receiver : friend.sender;
      if (profile?.city) locs.add(profile.city);
      if (profile?.region) locs.add(profile.region);
      if (profile?.country) locs.add(profile.country);
    });
    return Array.from(locs).sort();
  }, [friends, user?.id]);

  // Client-side sorting only (filtering is done server-side)
  const sortedFriends = useMemo(() => {
    const result = [...friends];
    
    result.sort((a, b) => {
      const profileA = a.sender_id === user?.id ? a.receiver : a.sender;
      const profileB = b.sender_id === user?.id ? b.receiver : b.sender;
      
      if (!profileA || !profileB) return 0;

      switch (sortBy) {
        case 'name':
          return profileA.name.localeCompare(profileB.name);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'location':
          const locA = profileA.city || profileA.region || profileA.country || '';
          const locB = profileB.city || profileB.region || profileB.country || '';
          return locA.localeCompare(locB);
        default:
          return 0;
      }
    });

    return result;
  }, [friends, sortBy, user?.id]);

  // Calculate statistics
  const stats = useMemo(() => {
    const locationStats: Record<string, number> = {};
    
    friends.forEach(friend => {
      const profile = friend.sender_id === user?.id ? friend.receiver : friend.sender;
      if (profile?.city) {
        locationStats[profile.city] = (locationStats[profile.city] || 0) + 1;
      }
    });

    const topLocation = Object.entries(locationStats)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      total: friends.length,
      topLocation: topLocation ? { name: topLocation[0], count: topLocation[1] } : null,
      locations: Object.keys(locationStats).length,
    };
  }, [friends, user?.id]);

  if (loading || friendsLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const FriendCard = ({ friend, isListView = false }: { friend: any; isListView?: boolean }) => {
    const profile = friend.sender_id === user?.id ? friend.receiver : friend.sender;
    const friendId = friend.sender_id === user?.id ? friend.receiver_id : friend.sender_id;
    
    if (!profile) return null;

    const location = [profile.city, profile.region, profile.country].filter(Boolean).join(', ');

    const handleSendMessage = async () => {
      const conversationId = await createConversation(friendId);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    };

    if (isListView) {
      return (
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${profile.username}`}>
              <Avatar className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link to={`/profile/${profile.username}`}>
                <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer truncate">
                  {profile.name}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Amis depuis</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(friend.created_at), { 
                    addSuffix: false, 
                    locale: fr 
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSendMessage}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Retirer ${profile.name} de vos amis ?`)) {
                      removeFriend(friendId);
                    }
                  }}
                  className="gap-2"
                >
                  <UserMinus className="w-4 h-4" />
                  Retirer
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link to={`/profile/${profile.username}`}>
            <Avatar className="w-20 h-20 border-4 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {profile.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="space-y-1 w-full">
            <Link to={`/profile/${profile.username}`}>
              <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer truncate">
                {profile.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground truncate">
              @{profile.username}
            </p>

            {location && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{location}</span>
              </div>
            )}

            <Badge variant="outline" className="text-xs mt-2">
              <Calendar className="w-3 h-3 mr-1" />
              Amis depuis {formatDistanceToNow(new Date(friend.created_at), { 
                addSuffix: false, 
                locale: fr 
              })}
            </Badge>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleSendMessage}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              asChild
            >
              <Link to={`/profile/${profile.username}`}>
                Voir profil
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Retirer ${profile.name} de vos amis ?`)) {
                  removeFriend(friendId);
                }
              }}
            >
              <UserMinus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/feed')} className="gap-2">
          <Home className="h-4 w-4" />
          Accueil
        </Button>
      </div>
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-8 h-8" />
              Mes amis
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez et découvrez vos amis
            </p>
          </div>
          
          <Button asChild>
            <Link to="/find-friends">
              Trouver des amis
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total d'amis</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary/50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Localisations</p>
                <p className="text-3xl font-bold">{stats.locations}</p>
              </div>
              <MapPin className="w-8 h-8 text-primary/50" />
            </div>
          </Card>

          {stats.topLocation && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ville populaire</p>
                  <p className="text-lg font-bold truncate">{stats.topLocation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.topLocation.count} ami{stats.topLocation.count > 1 ? 's' : ''}
                  </p>
                </div>
                <MapPin className="w-8 h-8 text-primary/50" />
              </div>
            </Card>
          )}
        </div>

        {/* Filters and Search */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un ami..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Localisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom (A-Z)</SelectItem>
                <SelectItem value="recent">Plus récent</SelectItem>
                <SelectItem value="location">Localisation</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Friends List with Infinite Scroll */}
        {sortedFriends.length === 0 && !friendsLoading ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || locationFilter !== 'all' 
                ? 'Aucun ami trouvé' 
                : 'Aucun ami pour le moment'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || locationFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Commencez à ajouter des amis pour construire votre réseau'}
            </p>
            <Button asChild>
              <Link to="/find-friends">
                Trouver des amis
              </Link>
            </Button>
          </Card>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage && (
                  <div className="animate-pulse text-muted-foreground">
                    Chargement...
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3">
              {sortedFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} isListView />
              ))}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage && (
                  <div className="animate-pulse text-muted-foreground">
                    Chargement...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
