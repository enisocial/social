import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { UnifiedFeedCard } from '@/components/UnifiedFeedCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { useUnifiedFeed } from '@/hooks/useUnifiedFeed';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Users, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Feed = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [feedMode, setFeedMode] = useState<'recommended' | 'recent' | 'friends'>('recommended');
  const [isFeedReady, setIsFeedReady] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  });

  // Pull-to-refresh disabled for now due to virtual scrolling conflicts
  const isRefreshing = false;
  const pullDistance = 0;

  const {
    items,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    trackPostView,
    trackPostClick,
    trackTimeSpent,
    trackListen,
    recordSignal,
    error
  } = useUnifiedFeed(user?.id, feedMode);

  // Différer l'initialisation du virtual scrolling pour de meilleures performances
  useEffect(() => {
    if (items.length > 0 && !postsLoading) {
      // Délai réduit pour chargement plus rapide
      const timer = setTimeout(() => setIsFeedReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsFeedReady(false);
    }
  }, [items.length, postsLoading]);

  const invalidateFeedCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
  }, [queryClient]);

  const handleReaction = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    recordSignal({ itemId, signalType: 'like', itemType });
  }, [recordSignal]);

  const handleLike = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    recordSignal({ itemId, signalType: 'like', itemType });
  }, [recordSignal]);

  const handleComment = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    // Navigate to post detail or comment modal
    navigate(`/post/${itemId}`);
  }, [navigate]);

  const handleShare = useCallback((itemId: string, itemType: 'post' | 'voice_post' = 'post') => {
    // TODO: Implement share functionality
    console.log('Share:', itemId, itemType);
  }, []);

  const handleDelete = useCallback(() => {
    // For now, just invalidate the cache to refresh the feed
    // In a real implementation, you might want to remove the item from local state
    queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
  }, [queryClient]);

  const handleListen = useCallback((itemId: string, duration: number, completed: boolean, itemType: 'post' | 'voice_post' = 'post') => {
    recordSignal({ itemId, signalType: 'listen', signalValue: duration, itemType });
  }, [recordSignal]);

  const handleFeedModeChange = useCallback((mode: 'recommended' | 'recent' | 'friends') => {
    setFeedMode(mode);
    setIsFeedReady(false); // Reset pour recharger
  }, []);

  // Automatic infinite scrolling
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log('🔄 AUTO FETCHING NEXT PAGE (intersection observer)...');
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);



  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FacebookFeedLayout>
      {/* Simple Feed Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Accueil
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Découvrez les dernières actualités de vos amis
        </p>
      </div>

      {/* Simple Feed Filters */}
      <div className="mb-6">
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => handleFeedModeChange('recommended')}
            disabled={postsLoading}
            variant={feedMode === 'recommended' ? 'default' : 'ghost'}
            className={`px-6 py-2 rounded-lg font-medium ${
              feedMode === 'recommended'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Pour vous
          </Button>

          <Button
            onClick={() => handleFeedModeChange('recent')}
            disabled={postsLoading}
            variant={feedMode === 'recent' ? 'default' : 'ghost'}
            className={`px-6 py-2 rounded-lg font-medium ${
              feedMode === 'recent'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Récents
          </Button>

          <Button
            onClick={() => handleFeedModeChange('friends')}
            disabled={postsLoading}
            variant={feedMode === 'friends' ? 'default' : 'ghost'}
            className={`px-6 py-2 rounded-lg font-medium ${
              feedMode === 'friends'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Amis
          </Button>
        </div>

        {postsLoading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Actualisation...</span>
          </div>
        )}
      </div>

      {/* Posts Feed */}
      <div
        ref={parentRef}
        className="h-full overflow-auto"
      >
        {postsLoading && !items.length ? (
          // Loading state with skeletons
          <div className="space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : error ? (
          // Error state with retry option
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Erreur de chargement
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Impossible de charger le contenu. Vérifiez votre connexion internet.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Actualiser la page
                </Button>
                <Button
                  onClick={() => handleFeedModeChange('recommended')}
                  variant="outline"
                >
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        ) : items.length === 0 && !postsLoading ? (
          // Empty state (no content available)
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center max-w-md">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Aucun contenu disponible
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {feedMode === 'recommended'
                  ? "Notre IA travaille à vous proposer du contenu personnalisé. Revenez bientôt !"
                  : feedMode === 'recent'
                  ? "Aucune publication récente à afficher. Soyez le premier à partager quelque chose !"
                  : "Aucun contenu de vos amis pour le moment. Invitez-les à rejoindre la communauté !"
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => handleFeedModeChange('recommended')}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Découvrir du contenu
                </Button>
                <Button
                  onClick={() => handleFeedModeChange('friends')}
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Voir mes amis
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Content loaded successfully
          <div className="space-y-0">
            {items.map((item, index) => (
              <div key={item.id} className="px-0">
                <UnifiedFeedCard
                  item={item}
                  onDelete={handleDelete}
                  onView={(id, type) => trackPostView(id, type)}
                  onClick={(id, type) => trackPostClick(id, type)}
                  onTimeSpent={(id, seconds, type) => trackTimeSpent(id, seconds, type)}
                  onReaction={(id, type) => handleReaction(id, type)}
                  onLike={(id, type) => handleLike(id, type)}
                  onComment={(id, type) => handleComment(id, type)}
                  onShare={(id, type) => handleShare(id, type)}
                  onListen={(id, duration, completed, type) => handleListen(id, duration, completed, type)}
                  priority={index < 12} // Priorité aux 12 premiers posts pour chargement ultra-rapide
                />
              </div>
            ))}

            {/* Invisible load more trigger for intersection observer */}
            {hasNextPage && !isFetchingNextPage && (
              <div ref={loadMoreRef} className="h-4" />
            )}

            {/* Loading indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">Chargement en cours...</span>
                </div>
              </div>
            )}

            {/* End of feed indicator */}
            {!hasNextPage && items.length > 0 && !postsLoading && (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Vous avez vu tous les posts !
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FacebookFeedLayout>
  );
};

export default Feed;
