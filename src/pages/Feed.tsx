import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { Navbar } from '@/components/Navbar';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { CreateStory } from '@/components/CreateStory';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { FacebookCreatePost } from '@/components/post/FacebookCreatePost';
import { ModernStories } from '@/components/feed/ModernStories';
import { LeftSidebar } from '@/components/feed/LeftSidebar';
import { RightSidebar } from '@/components/feed/RightSidebar';
import { LiveBubbles } from '@/components/live/LiveBubbles';
import { useStories } from '@/hooks/useStories';
import { useOptimizedFeed } from '@/hooks/useOptimizedFeed';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVirtualizer } from '@tanstack/react-virtual';

const Feed = () => {
  const { user, loading } = useAuth();
  usePresence(user?.id);
  const navigate = useNavigate();
  const { storyGroups, createStory, uploadProgress, isUploading } = useStories();
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [feedMode, setFeedMode] = useState<'recommended' | 'recent' | 'friends'>('recommended');
  const parentRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  const { 
    posts, 
    isLoading: postsLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    prefetchNextPage,
    invalidateFeedCache
  } = useOptimizedFeed({
    userId: user?.id,
    filterType: feedMode,
    pageSize: 15,
    enableRealtime: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id,name,username,avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity
  });

  // Virtualizer for posts
  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 600,
    overscan: 3,
  });

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Prefetch next page at 75% scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!parentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      if (scrollPercentage > 0.75 && hasNextPage && !isFetchingNextPage) {
        prefetchNextPage();
      }
    };

    const parent = parentRef.current;
    if (parent) {
      parent.addEventListener('scroll', handleScroll);
      return () => parent.removeEventListener('scroll', handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, prefetchNextPage]);

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <PushNotificationPrompt userId={user.id} />
      
      {/* 3-Column Layout */}
      <LeftSidebar />
      
      <main className="lg:ml-64 xl:mr-80 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Live Bubbles (TikTok-style) */}
          <LiveBubbles />
          
          {/* Stories Section */}
          <ModernStories
            storyGroups={storyGroups}
            onCreateStory={() => setCreateStoryOpen(true)}
            currentUserAvatar={profile?.avatar_url || undefined}
            currentUserName={profile?.name}
          />
          
          {/* Create Post */}
          <FacebookCreatePost />

          {/* Feed Filter Tabs */}
          <div className="flex gap-2 mb-4 p-1 bg-muted/50 rounded-lg">
            <Button
              variant={feedMode === 'recommended' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedMode('recommended')}
              className="flex-1 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Pour vous
            </Button>
            <Button
              variant={feedMode === 'recent' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedMode('recent')}
              className="flex-1"
            >
              Récents
            </Button>
            <Button
              variant={feedMode === 'friends' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedMode('friends')}
              className="flex-1"
            >
              Amis
            </Button>
          </div>

          {/* Virtualized Posts Feed */}
          <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
            {postsLoading && !posts.length ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <PostCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg shadow-md">
                <p className="text-muted-foreground">Aucun post à afficher</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Suivez des personnes ou créez votre premier post !
                </p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const post = posts[virtualRow.index];
                  return (
                    <div
                      key={post.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="pb-4">
                        <EnhancedPostCard
                          post={post}
                          onDelete={invalidateFeedCache}
                        />
                      </div>
                    </div>
                  );
                })}

                {isFetchingNextPage && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                <div ref={observerTarget} className="h-4" />
              </div>
            )}
          </div>
        </div>
      </main>

      <RightSidebar />

      {/* Create Story Dialog */}
      <CreateStory
        open={createStoryOpen}
        onOpenChange={setCreateStoryOpen}
        onCreateStory={async (file) => {
          await createStory(file);
          setCreateStoryOpen(false);
        }}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
      />
    </div>
  );
};

export default Feed;
