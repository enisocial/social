import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { useSmartFeed } from '@/hooks/useSmartFeed';
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
    if (!post) return 700; // Default size with footer

    let size = 300; // Base size for header, content, footer and margins

    // Header size (avatar, name, badges, etc.)
    size += 120;

    // Content size - optimisé
    const contentLength = post.content?.length || 0;
    if (contentLength > 0) {
      size += Math.min(80 + (contentLength / 50) * 20, 150); // Dynamic content height
    }

    // Media size - optimisé avec calcul plus précis
    const mediaCount = post.post_media?.length || 0;
    if (mediaCount > 0) {
      if (mediaCount === 1) {
        size += 400; // Single media - large
      } else if (mediaCount === 2) {
        size += 250; // Two media side by side
      } else if (mediaCount === 3) {
        size += 350; // 3 media - special layout
      } else if (mediaCount <= 4) {
        size += 300; // 4 media grid
      } else {
        size += 450; // Many media
      }
    }

    // Link preview
    if (post.link_preview) size += 180;

    // Tags section
    const tagsCount = post.post_tags?.length || 0;
    if (tagsCount > 0) size += 40;

    // Reactions/stats section
    if (post.likes_count > 0 || post.comments_count > 0 || post.shares_count > 0) {
      size += 50;
    }

    // Footer with actions - TOUJOURS COMPTE
    size += 80; // Fixed footer height

    // Margin between posts - Minimal spacing for ultra-modern dense layout (~2mm)
    size += 8;

    return Math.min(size, 1200); // Cap at 1200px
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
      {/* HEADER ULTRA-MODERNE DU FIL D'ACTUALITÉ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-8"
      >
        {/* FOND ANIMÉ DU HEADER */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 via-cyan-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-rose-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative bg-gradient-to-r from-white/95 via-blue-50/80 to-indigo-50/80 dark:from-slate-900/95 dark:via-blue-950/80 dark:to-indigo-950/80 backdrop-blur-xl rounded-3xl border border-white/30 dark:border-slate-700/50 shadow-2xl p-8 overflow-hidden">
          {/* ÉLÉMENTS DÉCORATIFS */}
          <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-lg"></div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* ICÔNE ANIMÉE DU FIL */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 1, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl flex items-center justify-center">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </motion.div>

              <div className="space-y-1">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent"
                >
                  Mon Fil d'Actualité
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-lg text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2"
                >
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Découvrez ce qui compte pour vous
                </motion.p>
              </div>
            </div>


          </div>
        </div>
      </motion.div>

      {/* BOUTONS DE FILTRAGE ULTRA-MODERNES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-r from-white/95 via-blue-50/90 to-indigo-50/90 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-600/90 backdrop-blur-xl rounded-3xl border-2 border-white/40 dark:border-slate-700/60 shadow-2xl p-6 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            {/* BOUTON POUR VOUS */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleFeedModeChange('recommended')}
                disabled={postsLoading}
                className={`relative overflow-hidden px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  feedMode === 'recommended'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-amber-500/25'
                    : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-amber-50 hover:via-orange-50 hover:to-red-50 dark:hover:from-amber-950/30 dark:hover:via-orange-950/30 dark:hover:to-red-950/30 border-2 border-slate-200/50 dark:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    feedMode === 'recommended'
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50'
                  }`}>
                    <Sparkles className={`w-5 h-5 transition-all duration-300 ${
                      feedMode === 'recommended' ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold transition-all duration-300 ${
                      feedMode === 'recommended' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      Pour vous
                    </div>
                  </div>
                </div>
                {feedMode === 'recommended' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                )}
              </Button>
            </motion.div>

            {/* BOUTON RÉCENTS */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleFeedModeChange('recent')}
                disabled={postsLoading}
                className={`relative overflow-hidden px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  feedMode === 'recent'
                    ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-emerald-500/25'
                    : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-emerald-50 hover:via-green-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:via-green-950/30 dark:hover:to-teal-950/30 border-2 border-slate-200/50 dark:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    feedMode === 'recent'
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50'
                  }`}>
                    <Clock className={`w-5 h-5 transition-all duration-300 ${
                      feedMode === 'recent' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold transition-all duration-300 ${
                      feedMode === 'recent' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      Récents
                    </div>
                  </div>
                </div>
                {feedMode === 'recent' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                )}
              </Button>
            </motion.div>

            {/* BOUTON COMMUNAUTÉ */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleFeedModeChange('friends')}
                disabled={postsLoading}
                className={`relative overflow-hidden px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  feedMode === 'friends'
                    ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white shadow-purple-500/25'
                    : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-950/30 dark:hover:via-indigo-950/30 dark:hover:to-blue-950/30 border-2 border-slate-200/50 dark:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    feedMode === 'friends'
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50'
                  }`}>
                    <Users className={`w-5 h-5 transition-all duration-300 ${
                      feedMode === 'friends' ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold transition-all duration-300 ${
                      feedMode === 'friends' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      Communauté
                    </div>
                  </div>
                </div>
                {feedMode === 'friends' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                )}
              </Button>
            </motion.div>
          </div>

          {/* INDICATEUR DE CHARGEMENT */}
          {postsLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 mt-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/30 dark:border-blue-800/30"
            >
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Actualisation de votre fil personnalisé...
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center min-h-[60vh] p-8"
          >
            <div className="text-center max-w-md">
              {/* ICÔNE ANIMÉE D'ÉTAT VIDE */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                className="relative mb-8"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-600 dark:to-slate-500 rounded-3xl shadow-2xl flex items-center justify-center mx-auto">
                  <Activity className="w-12 h-12 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">💭</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
                  Votre fil est vide pour le moment
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                  {feedMode === 'recommended'
                    ? "Notre IA travaille à vous proposer du contenu personnalisé. Revenez bientôt !"
                    : feedMode === 'recent'
                    ? "Aucune publication récente à afficher. Soyez le premier à partager quelque chose !"
                    : "Aucun contenu de vos amis pour le moment. Invitez-les à rejoindre la communauté !"
                  }
                </p>

                {/* ACTIONS SUGGÉRÉES */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
                >
                  <Button
                    onClick={() => handleFeedModeChange('recommended')}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Découvrir du contenu
                  </Button>

                  <Button
                    onClick={() => handleFeedModeChange('friends')}
                    variant="outline"
                    className="border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 px-6 py-3 rounded-xl transition-all duration-300"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Voir mes amis
                  </Button>
                </motion.div>
              </motion.div>

              {/* ÉLÉMENTS DÉCORATIFS */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400/30 rounded-full animate-ping"></div>
              <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
            </div>
          </motion.div>
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
                  <div className="px-0.5 py-1">
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
