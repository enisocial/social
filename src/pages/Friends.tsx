import { useAuth } from '@/hooks/useAuth';
import { usePaginatedFriends } from '@/hooks/usePaginatedFriends';
import { useOptimizedFriendRequests } from '@/hooks/useOptimizedFriendRequests';
import { useConversations } from '@/hooks/useConversations';
import { useMessenger } from '@/contexts/MessengerContext';
import { useState, useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Home,
  Sparkles,
  Globe,
  UserCheck,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'recent' | 'location';

export default function Friends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { removeFriend } = useOptimizedFriendRequests();
  const { createConversation } = useConversations();
  const { openBubble } = useMessenger();
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
        openBubble(conversationId, profile);
      }
    };

    if (isListView) {
      return (
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <Avatar
              className="w-16 h-16 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => openBubble(null, profile)}
            >
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

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
              <Link to={`/profile/${profile.username}`}>
                <Button variant="ghost" size="sm" className="text-xs mt-1">
                  Voir le profil
                </Button>
              </Link>
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
          <Avatar
            className="w-20 h-20 border-4 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => openBubble(null, profile)}
          >
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {profile.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          <div className="absolute top-10 left-10 w-32 h-32 bg-amber-400/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* TITRE PRINCIPAL AVEC DESIGN AFRICAIN */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Mes amis
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                    Connectez-vous avec votre communauté panafricaine
                  </p>
                </div>
              </div>

              {/* BADGES STATISTIQUES RAPIDES */}
              <div className="flex flex-wrap gap-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-emerald-200/50"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {stats.total} ami{stats.total !== 1 ? 's' : ''}
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-teal-200/50"
                >
                  <Globe className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {stats.locations} pays représentés
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-cyan-200/50"
                >
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Communauté active
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* ACTIONS PRINCIPALES */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                variant="outline"
                onClick={() => navigate('/feed')}
                className="gap-2 border-emerald-200/50 hover:bg-emerald-50 dark:border-emerald-800/50 dark:hover:bg-emerald-950/50"
              >
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Button>

              <Button
                asChild
                className="gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl"
              >
                <Link to="/find-friends">
                  <Sparkles className="w-4 h-4" />
                  Découvrir de nouveaux amis
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="space-y-8">
          {/* STATISTIQUES DÉTAILLÉES AVEC ANIMATIONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* TOTAL AMIS */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-0 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 opacity-80" />
                    <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-emerald-100 text-sm font-medium">Total d'amis</p>
                    <p className="text-3xl font-black">{stats.total}</p>
                    <p className="text-xs text-emerald-200">Membres actifs</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* LOCALISATIONS */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 border-0 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Globe className="w-8 h-8 opacity-80" />
                    <div className="w-3 h-3 bg-teal-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-teal-100 text-sm font-medium">Pays représentés</p>
                    <p className="text-3xl font-black">{stats.locations}</p>
                    <p className="text-xs text-teal-200">Diversité géographique</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* VILLE POPULAIRE */}
            {stats.topLocation && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 border-0 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="relative p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <MapPin className="w-8 h-8 opacity-80" />
                      <div className="w-3 h-3 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-cyan-100 text-sm font-medium">Ville populaire</p>
                      <p className="text-xl font-black truncate">{stats.topLocation.name}</p>
                      <p className="text-xs text-cyan-200">
                        {stats.topLocation.count} ami{stats.topLocation.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ENGAGEMENT */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 border-0 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Heart className="w-8 h-8 opacity-80" />
                    <div className="w-3 h-3 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-purple-100 text-sm font-medium">Connexions</p>
                    <p className="text-3xl font-black">100%</p>
                    <p className="text-xs text-purple-200">Authentiques</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* BARRE DE RECHERCHE ET FILTRES ULTRA-MODERNE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* RECHERCHE PRINCIPALE */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-emerald-500" />
                    </div>
                    <Input
                      placeholder="🔍 Rechercher dans vos amis..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 text-base border-2 border-emerald-200/50 focus:border-emerald-400 rounded-xl shadow-sm"
                    />
                  </div>

                  {/* FILTRES AVANCÉS */}
                  <div className="flex flex-wrap gap-4">
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-full lg:w-[200px] h-12 border-2 border-teal-200/50 focus:border-teal-400 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-teal-500" />
                          <SelectValue placeholder="🌍 Localisation" />
                        </div>
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
                      <SelectTrigger className="w-full lg:w-[180px] h-12 border-2 border-cyan-200/50 focus:border-cyan-400 rounded-xl">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4 text-cyan-500" />
                          <SelectValue placeholder="Trier par" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">📝 Nom (A-Z)</SelectItem>
                        <SelectItem value="recent">🕒 Plus récent</SelectItem>
                        <SelectItem value="location">📍 Localisation</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* BOUTONS DE VUE */}
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setViewMode('grid')}
                        className={`h-12 px-4 rounded-xl border-2 ${
                          viewMode === 'grid'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent'
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        <Grid className="w-5 h-5" />
                        <span className="hidden sm:inline ml-2">Grille</span>
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setViewMode('list')}
                        className={`h-12 px-4 rounded-xl border-2 ${
                          viewMode === 'list'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent'
                            : 'border-gray-300 hover:border-teal-300'
                        }`}
                      >
                        <List className="w-5 h-5" />
                        <span className="hidden sm:inline ml-2">Liste</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* LISTE D'AMIS AVEC ANIMATIONS */}
          {sortedFriends.length === 0 && !friendsLoading ? (
            // ÉTAT VIDE ULTRA-MODERNE
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-white/90 via-gray-50/80 to-white/90 dark:from-gray-800/90 dark:via-gray-700/80 dark:to-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-16 text-center">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                    <Users className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {/* Motifs décoratifs africains */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                  {searchQuery || locationFilter !== 'all'
                    ? '🔍 Aucun ami trouvé'
                    : '🌍 Aucun ami pour le moment'}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  {searchQuery || locationFilter !== 'all'
                    ? 'Essayez de modifier vos filtres de recherche ou vérifiez l\'orthographe.'
                    : 'Commencez à construire votre réseau panafricain en découvrant de nouveaux amis partageant vos intérêts.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-xl px-8 py-3 text-lg"
                  >
                    <Link to="/find-friends">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Découvrir des amis
                    </Link>
                  </Button>

                  {(searchQuery || locationFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setLocationFilter('all');
                      }}
                      className="px-8 py-3 text-lg border-2 border-gray-300 hover:border-emerald-300"
                    >
                      Effacer les filtres
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : viewMode === 'grid' ? (
            // VUE GRILLE ULTRA-MODERNE
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {sortedFriends.map((friend, index) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <FriendCard friend={friend} />
                  </motion.div>
                ))}
              </motion.div>

              {/* CHARGEMENT INFINI MODERNE */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-12">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Chargement d'amis...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      className="border-2 border-emerald-200 hover:border-emerald-300 rounded-full px-8 py-3"
                    >
                      Charger plus d'amis
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            // VUE LISTE ULTRA-MODERNE
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="space-y-4"
              >
                {sortedFriends.map((friend, index) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <FriendCard friend={friend} isListView />
                  </motion.div>
                ))}
              </motion.div>

              {/* CHARGEMENT INFINI MODERNE */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-12">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Chargement d'amis...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      className="border-2 border-emerald-200 hover:border-emerald-300 rounded-full px-8 py-3"
                    >
                      Charger plus d'amis
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
