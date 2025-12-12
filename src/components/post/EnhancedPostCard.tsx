import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { MessageCircle, MoreVertical, Share2, Heart, Eye, Clock, Globe, Users, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { SharePostDialog } from '../SharePostDialog';
import { ReactionPicker } from '../ReactionPicker';
import { usePostReactions } from '@/hooks/usePostReactions';
import { EditPostDialog } from '../EditPostDialog';
import { OptimizedMediaWithCache } from '@/components/ui/OptimizedMediaWithCache';
import { usePostViews } from '@/hooks/usePostViews';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedPostCardProps {
  post: any;
  onDelete?: () => void;
  onView?: (postId: string) => void;
  onClick?: (postId: string) => void;
  onTimeSpent?: (postId: string, seconds: number) => void;
  onReaction?: (postId: string) => void;
  priority?: boolean;
}

const EnhancedPostCardComponent = ({
  post,
  onDelete,
  onView,
  onClick,
  onTimeSpent,
  onReaction,
  priority = false
}: EnhancedPostCardProps) => {
  const { user } = useAuth();
  const { reactions, userReaction, totalCount, toggleReaction } = usePostReactions(post.id, user?.id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sharePostDialogOpen, setSharePostDialogOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewStartTime = useRef<number>(0);

  // Gestion des vues
  const { viewsData, trackView } = usePostViews();

  const postMedia = useMemo(() => post.post_media || [], [post.post_media]);
  const postTags = useMemo(() => post.post_tags || [], [post.post_tags]);

  const profile = useMemo(() => ({
    username: post.username || post.profiles?.username || 'unknown',
    name: post.name || post.profiles?.name || 'Unknown User',
    avatar_url: post.avatar_url || post.profiles?.avatar_url || null
  }), [post.username, post.profiles, post.name, post.avatar_url]);

  const likesCount = post.likes_count ?? post.likes?.length ?? 0;
  const commentsCount = post.comments_count ?? post.comments?.length ?? 0;

  // Track view quand le post est visible
  useEffect(() => {
    if (!cardRef.current || hasTrackedView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            viewStartTime.current = Date.now();
            if (!hasTrackedView) {
              trackView(post.id);
              if (onView) onView(post.id);
              setHasTrackedView(true);
            }
          } else if (viewStartTime.current > 0) {
            const timeSpent = Math.floor((Date.now() - viewStartTime.current) / 1000);
            if (onTimeSpent && timeSpent > 0) {
              onTimeSpent(post.id, timeSpent);
            }
            viewStartTime.current = 0;
          }
        });
      },
      { threshold: [0.3, 0.5, 0.7] }
    );

    observer.observe(cardRef.current);

    return () => {
      if (viewStartTime.current > 0 && onTimeSpent) {
        const timeSpent = Math.floor((Date.now() - viewStartTime.current) / 1000);
        if (timeSpent > 0) {
          onTimeSpent(post.id, timeSpent);
        }
      }
      observer.disconnect();
    };
  }, [hasTrackedView, onView, onTimeSpent, post.id, trackView]);

  const handleDelete = useCallback(async () => {
    if (!user || user.id !== post.user_id) return;

    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer ce post ?');
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;

      toast.success('Post supprimé');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  }, [user, post.user_id, post.id, onDelete]);

  const navigate = useNavigate();

  const handleShowComments = useCallback(() => {
    navigate(`/post/${post.id}`);
  }, [navigate, post.id]);

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'friends':
        return <Users className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <>
      <div ref={cardRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Link to={`/profile/${post.user_id}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback>{profile.name[0]}</AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/profile/${post.user_id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                    {profile.name}
                  </Link>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-gray-500 mt-1">
                  {getPrivacyIcon(post.privacy || 'public')}
                </div>
              </div>
            </div>

            {user?.id === post.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* Media */}
        {postMedia && postMedia.length > 0 && (
          <div className="mb-3">
            <div className={`grid gap-1 ${
              postMedia.length === 1 ? 'grid-cols-1' :
              postMedia.length === 2 ? 'grid-cols-2' :
              postMedia.length === 3 ? 'grid-cols-2' :
              postMedia.length === 4 ? 'grid-cols-2' :
              'grid-cols-3'
            }`}>
              {postMedia.slice(0, 6).map((media, idx) => {
                const aspectRatio = postMedia.length === 1 ? 'auto' : 'square';

                return (
                  <OptimizedMediaWithCache
                    key={`${media.id}-${idx}`}
                    src={media.media_url}
                    alt={`Média de ${profile.name}`}
                    type={media.media_type === 'video' ? 'video' : 'image'}
                    aspectRatio={aspectRatio}
                    priority={priority}
                    quality="medium"
                    showControls={media.media_type === 'video'}
                    autoPlay={media.media_type === 'video'}
                    muted={true}
                    className={postMedia.length === 3 && idx === 0 ? 'col-span-2 row-span-2' : ''}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {(totalCount > 0 || commentsCount > 0) && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                {totalCount > 0 && (
                  <span>{totalCount} J'aime</span>
                )}
                {commentsCount > 0 && (
                  <span>{commentsCount} commentaire{commentsCount > 1 ? 's' : ''}</span>
                )}
              </div>
              {(viewsData[post.id]?.viewsCount || post.views_count || 0) > 0 && (
                <span>{viewsData[post.id]?.viewsCount || post.views_count || 0} vue{viewsData[post.id]?.viewsCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <ReactionPicker currentReaction={userReaction || null} onSelect={toggleReaction}>
              <Button
                variant="ghost"
                className={`flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  userReaction ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Heart className={`w-5 h-5 ${userReaction ? 'fill-current' : ''}`} />
                J'aime
              </Button>
            </ReactionPicker>

            <Button
              variant="ghost"
              onClick={handleShowComments}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MessageCircle className="w-5 h-5" />
              Commenter
            </Button>

            <Button
              variant="ghost"
              onClick={() => setSharePostDialogOpen(true)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Share2 className="w-5 h-5" />
              Partager
            </Button>
          </div>
        </div>
      </div>

      <SharePostDialog
        postId={post.id}
        open={sharePostDialogOpen}
        onOpenChange={setSharePostDialogOpen}
      />

      <EditPostDialog
        post={post}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
};

export const EnhancedPostCard = memo(EnhancedPostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.updated_at === nextProps.post.updated_at &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.views_count === nextProps.post.views_count
  );
});
