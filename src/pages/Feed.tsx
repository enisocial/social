import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { UnifiedFeedCard } from '@/components/UnifiedFeedCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { useUnifiedFeed } from '@/hooks/useUnifiedFeed';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, RefreshCw, TrendingUp, Users, Clock, Zap, Heart, MessageCircle, Eye, Star, Crown, Flame, Target, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useIsMobile } from '@/hooks/use-mobile';

const Feed = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [feedMode, setFeedMode] = useState<'recommended' | 'recent' | 'friends'>('recommended');
  const [isFeedReady, setIsFeedReady] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);

  // Pull-to-refresh handlers (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !parentRef.current || parentRef.current.scrollTop > 10) return;
    setStartY(e.touches[0].clientY);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || startY === null || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) { // Only handle downward pulls
      const distance = Math.min(deltaY * 0.5, 80); // Dampen the pull and cap at 80px
      setPullDistance(distance);
      setCanRefresh(distance > 50); // Trigger refresh when pulled 50px
    }
  }, [isMobile, startY, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isMobile || !canRefresh || isRefreshing) {
      setPullDistance(0);
      setStartY(null);
      setCanRefresh(false);
      return;
    }

    // Trigger refresh
    setIsRefreshing(true);
    setPullDistance(0);
    setStartY(null);
    setCanRefresh(false);

    try {
      // Invalidate and refetch feed data
      await queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
      // Wait a bit for the refresh animation
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  }, [isMobile, canRefresh, isRefreshing, queryClient]);

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
    recordSignal
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

  // Estimate size for virtual scrolling - optimisé pour éviter les recalculs
  const getItemSize = useCallback((index: number) => {
    const item = items[index];
    if (!item) return 700; // Default size with footer

    let size = 300; // Base size for header, content, footer and margins

    // Header size (avatar, name, badges, etc.)
    size += 120;

    // Content size - optimisé
    const contentLength = item.content?.length || 0;
    if (contentLength > 0) {
      size += Math.min(80 + (contentLength / 50) * 20, 150); // Dynamic content height
    }

    // Media size - optimisé avec calcul plus précis
    if (item.type === 'post') {
      const mediaCount = item.post_media?.length || 0;
      const hasVideo = item.post_media?.some(media => media.media_type === 'video') || false;

      if (mediaCount > 0) {
        if (mediaCount === 1) {
          size += hasVideo ? 550 : 400; // Single media - larger for videos
        } else if (mediaCount === 2) {
          size += hasVideo ? 350 : 250; // Two media side by side, taller for videos
        } else if (mediaCount === 3) {
          size += hasVideo ? 450 : 350; // 3 media - special layout, taller for videos
        } else if (mediaCount <= 4) {
          size += hasVideo ? 400 : 300; // 4 media grid, taller for videos
        } else {
          size += hasVideo ? 550 : 450; // Many media, taller for videos
        }
      }
    } else if (item.type === 'voice_post') {
      // Voice posts have a fixed size with waveform
      size += 200; // Player + waveform height
    }

    // Link preview
    if (item.link_preview) size += 180;

    // Tags section
    const tagsCount = item.post_tags?.length || 0;
    if (tagsCount > 0) size += 40;

    // Reactions/stats section
    if (item.likes_count > 0 || item.comments_count > 0 || item.shares_count > 0) {
      size += 50;
    }

    // Footer with actions - TOUJOURS COMPTE
    size += 80; // Fixed footer height

    return Math.min(size, 1200); // Cap at 1200px
  }, [items]);

  // Virtual scrolling setup - seulement quand prêt
  const rowVirtualizer = useVirtualizer({
    count: isFeedReady ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemSize,
    overscan: isMobile ? 2 : 3, // Reduced overscan for mobile performance
  });

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

      {/* Pull-to-refresh indicator (mobile only) */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border flex items-center justify-center py-2 transition-all duration-200"
          style={{
            transform: `translateY(${Math.max(-60, pullDistance - 60)}px)`,
            opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 1
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-muted-foreground">
              {isRefreshing ? 'Actualisation...' : canRefresh ? 'Lâchez pour actualiser' : 'Tirez pour actualiser'}
            </span>
          </div>
        </div>
      )}

      {/* Posts Feed with Virtual Scrolling */}
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={isMobile && pullDistance > 0 ? {
          transform: `translateY(${pullDistance}px)`,
          transition: 'none'
        } : {}}
      >
        {postsLoading && !items.length ? (
          <div className="space-y-4 p-4">
            {[...Array(2)].map((_, i) => (
              <PostCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
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

            {/* Load more trigger */}
            {hasNextPage && !isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <Button
                  onClick={() => fetchNextPage()}
                  variant="outline"
                  className="px-6 py-2"
                >
                  Charger plus de posts
                </Button>
              </div>
            )}

            {/* Loading indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        )}
      </div>
    </FacebookFeedLayout>
  );
};

export default Feed;
