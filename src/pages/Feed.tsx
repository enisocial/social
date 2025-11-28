import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { useSmartFeed } from '@/hooks/useSmartFeed';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      await queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
      // Wait a bit for the refresh animation
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  }, [isMobile, canRefresh, isRefreshing, queryClient]);

  const {
    posts,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    trackPostView,
    trackPostClick,
    trackTimeSpent,
    recordSignal
  } = useSmartFeed(user?.id, feedMode);

  // Différer l'initialisation du virtual scrolling pour de meilleures performances
  useEffect(() => {
    if (posts.length > 0 && !postsLoading) {
      // Délai réduit pour chargement plus rapide
      const timer = setTimeout(() => setIsFeedReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsFeedReady(false);
    }
  }, [posts.length, postsLoading]);

  const invalidateFeedCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
  }, [queryClient]);

  const handleReaction = useCallback((postId: string) => {
    recordSignal({ postId, signalType: 'like' });
  }, [recordSignal]);

  const handleFeedModeChange = useCallback((mode: 'recommended' | 'recent' | 'friends') => {
    setFeedMode(mode);
    setIsFeedReady(false); // Reset pour recharger
  }, []);

  // Estimate size for virtual scrolling - optimisé pour éviter les recalculs
  const getPostSize = useCallback((index: number) => {
    const post = posts[index];
    if (!post) return 600; // Default size

    let size = 200; // Base size for header and footer

    // Content size - optimisé
    const contentLength = post.content?.length || 0;
    if (contentLength > 200) size += 100;
    if (contentLength > 500) size += 100;

    // Media size - optimisé
    const mediaCount = post.post_media?.length || 0;
    if (mediaCount === 1) size += 400;
    else if (mediaCount <= 4) size += 300;
    else if (mediaCount > 4) size += 500;

    // Link preview
    if (post.link_preview) size += 200;

    // Reactions/comments section
    if (post.likes_count > 0 || post.comments_count > 0) size += 60;

    return Math.min(size, 800); // Cap at 800px
  }, [posts]);

  // Virtual scrolling setup - seulement quand prêt
  const rowVirtualizer = useVirtualizer({
    count: isFeedReady ? posts.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: getPostSize,
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
      {/* Feed Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="flex gap-2">
          <Button
            variant={feedMode === 'recommended' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFeedModeChange('recommended')}
            className="gap-2"
            disabled={postsLoading}
          >
            <Sparkles className="h-4 w-4" />
            Pour vous
          </Button>
          <Button
            variant={feedMode === 'recent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFeedModeChange('recent')}
            disabled={postsLoading}
          >
            Récents
          </Button>
          <Button
            variant={feedMode === 'friends' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFeedModeChange('friends')}
            disabled={postsLoading}
          >
            Amis
          </Button>
        </div>
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
        {postsLoading && !posts.length ? (
          <div className="space-y-4 p-4">
            {[...Array(2)].map((_, i) => (
              <PostCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center m-4">
            <div className="text-gray-500">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun post à afficher</h3>
              <p>Suivez des personnes ou créez votre premier post !</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const post = posts[virtualItem.index];
              return (
                <div
                  key={post.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="p-4">
                    <EnhancedPostCard
                      post={post}
                      onDelete={invalidateFeedCache}
                      onView={trackPostView}
                      onClick={trackPostClick}
                      onTimeSpent={trackTimeSpent}
                      onReaction={handleReaction}
                      priority={virtualItem.index < 6} // Priorité aux 6 premiers posts pour chargement ultra-rapide
                    />
                  </div>
                </div>
              );
            })}

            {/* Load more trigger at the end */}
            {hasNextPage && !isFetchingNextPage && (
              <div
                style={{
                  position: 'absolute',
                  top: `${rowVirtualizer.getTotalSize()}px`,
                  left: 0,
                  width: '100%',
                  height: '4px',
                }}
                ref={(el) => {
                  if (el) {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        if (entries[0].isIntersecting) {
                          fetchNextPage();
                        }
                      },
                      { threshold: 0.1 }
                    );
                    observer.observe(el);
                    return () => observer.disconnect();
                  }
                }}
              />
            )}

            {/* Loading indicator */}
            {isFetchingNextPage && (
              <div
                style={{
                  position: 'absolute',
                  top: `${rowVirtualizer.getTotalSize()}px`,
                  left: 0,
                  width: '100%',
                  padding: '2rem',
                }}
              >
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
