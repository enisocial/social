import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { MessageCircle, Trash2, MoreVertical, Share2, Edit, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ShareDialog } from '../ShareDialog';
import { SharePostDialog } from '../SharePostDialog';
import { ReactionPicker } from '../ReactionPicker';
import { ReactionsSummary } from '../ReactionsSummary';
import { PostReactionsDialog } from '../PostReactionsDialog';
import { usePostReactions } from '@/hooks/usePostReactions';
import { EditPostDialog } from '../EditPostDialog';
import { PostStats } from './PostStats';
import { AutoplayVideo } from '../AutoplayVideo';
import { OptimizedMediaWithCache } from '@/components/ui/OptimizedMediaWithCache';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePostDialogOpen, setSharePostDialogOpen] = useState(false);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewStartTime = useRef<number>(0);

  // ✅ OPTIMISATION: Utiliser directement les données déjà chargées (pas de requêtes supplémentaires)
  // Les médias et tags sont déjà chargés par useSmartFeed, pas besoin de requêtes supplémentaires
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
    if (!cardRef.current || !user || hasTrackedView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Post devient visible
            viewStartTime.current = Date.now();
            if (!hasTrackedView && onView) {
              onView(post.id);
              setHasTrackedView(true);
            }
          } else if (viewStartTime.current > 0) {
            // Post n'est plus visible, calculer le temps passé
            const timeSpent = Math.floor((Date.now() - viewStartTime.current) / 1000);
            if (onTimeSpent && timeSpent > 0) {
              onTimeSpent(post.id, timeSpent);
            }
            viewStartTime.current = 0;
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => {
      // Cleanup: enregistrer le temps final si applicable
      if (viewStartTime.current > 0 && onTimeSpent) {
        const timeSpent = Math.floor((Date.now() - viewStartTime.current) / 1000);
        if (timeSpent > 0) {
          onTimeSpent(post.id, timeSpent);
        }
      }
      observer.disconnect();
    };
  }, [user, hasTrackedView, onView, onTimeSpent, post.id]);

  // ✅ OPTIMISATION: Memoizer handleDelete
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

  return (
    <Card ref={cardRef} className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${post.user_id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback>{profile.name[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${post.user_id}`} className="font-semibold hover:underline">
              {profile.name}
            </Link>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}</span>
              {post.feeling && (
                <>
                  <span>•</span>
                  <span>se sent {post.feeling}</span>
                </>
              )}
              {post.location && (
                <>
                  <span>•</span>
                  <MapPin className="h-3 w-3 inline" />
                  <span>{post.location}</span>
                </>
              )}
            </div>
            {postTags && postTags.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Users className="h-3 w-3" />
                <span>avec</span>
                {postTags.map((tag, idx) => (
                  <span key={tag.id}>
                    <Link to={`/profile/${tag.tagged_user_id}`} className="hover:underline font-medium text-foreground">
                      {tag.tagged_user.name}
                    </Link>
                    {idx < postTags.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {user?.id === post.user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {post.content && (
          <div 
            className={post.background_color ? 'text-white font-semibold text-center p-8 rounded-lg text-xl' : ''}
            style={post.background_color ? { background: post.background_color, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}
          >
            <p className="whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )}

        {/* Media Grid - Ultra optimisé avec OptimizedMedia */}
        {postMedia && postMedia.length > 0 && !post.background_color && (
          <div className={`grid gap-2 ${
            postMedia.length === 1 ? 'grid-cols-1' :
            postMedia.length === 2 ? 'grid-cols-2' :
            postMedia.length === 3 ? 'grid-cols-2' :
            postMedia.length === 4 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {postMedia.slice(0, 6).map((media, idx) => {
              // Déterminer l'aspect ratio selon le nombre et position
              let aspectRatio: 'square' | 'video' | 'portrait' | 'auto' = 'square';
              // ULTRA PRIORITÉ: Tous les médias des posts prioritaires chargent immédiatement
              let mediaPriority = priority;

              if (postMedia.length === 1) {
                aspectRatio = media.media_type === 'video' ? 'video' : 'auto';
              } else if (postMedia.length === 3 && idx === 0) {
                aspectRatio = 'video'; // Premier média en format vidéo pour 3 médias
              }

              // Vérifier que l'URL du média est valide
              const mediaUrl = media.media_url;
              if (!mediaUrl || mediaUrl.trim() === '') {
                console.warn('⚠️ Média sans URL valide:', media);
                return null;
              }

              console.log('📸 Affichage média:', { id: media.id, url: mediaUrl, type: media.media_type, priority: mediaPriority });

              return (
                <OptimizedMediaWithCache
                  key={`${media.id}-${idx}`}
                  src={mediaUrl}
                  alt={`Média de ${profile.name}`}
                  type={media.media_type === 'video' ? 'video' : 'image'}
                  aspectRatio={aspectRatio}
                  priority={mediaPriority}
                  quality="medium"
                  showControls={media.media_type === 'video'}
                  autoPlay={media.media_type === 'video'} // Lecture automatique pour les vidéos
                  muted={true}
                  className={cn(
                    postMedia.length === 3 && idx === 0 ? 'col-span-2 row-span-2' : '',
                    postMedia.length > 6 && idx === 5 ? 'relative' : ''
                  )}
                  onClick={() => media.media_type !== 'video' && window.open(mediaUrl, '_blank')}
                />
              );
            }).filter(Boolean)}

            {/* Indicateur pour plus de médias */}
            {postMedia.length > 6 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                +{postMedia.length - 6}
              </div>
            )}
          </div>
        )}

        {/* Link Preview */}
        {post.link_preview && !post.background_color && (
          <a 
            href={post.link_preview.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block border rounded-lg overflow-hidden hover:bg-accent/5 transition-colors"
          >
            {post.link_preview.image && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img 
                  src={post.link_preview.image} 
                  alt={post.link_preview.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <div className="text-xs text-muted-foreground truncate mb-1">
                {post.link_preview.url}
              </div>
              <div className="font-semibold line-clamp-1">{post.link_preview.title}</div>
              {post.link_preview.description && (
                <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {post.link_preview.description}
                </div>
              )}
            </div>
          </a>
        )}

        {/* Reactions and Stats Summary */}
        {(totalCount > 0 || commentsCount > 0 || post.share_count > 0) && (
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2">
            <div>
              {totalCount > 0 && (
                <ReactionsSummary 
                  reactions={reactions} 
                  totalCount={totalCount}
                  onClick={() => setReactionsDialogOpen(true)}
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              {commentsCount > 0 && (
                <Link to={`/post/${post.id}`} className="hover:underline">
                  {commentsCount} commentaire{commentsCount > 1 ? 's' : ''}
                </Link>
              )}
              {post.share_count > 0 && (
                <span>{post.share_count} partage{post.share_count > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-around border-t pt-2">
        <ReactionPicker 
          currentReaction={userReaction || null}
          onSelect={toggleReaction}
        >
          <Button variant="ghost" size="sm" className="gap-2">
            J'aime
          </Button>
        </ReactionPicker>
        <Link to={`/post/${post.id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Commenter
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSharePostDialogOpen(true)}>
          <Share2 className="h-4 w-4" />
          Partager
        </Button>
      </CardFooter>

      <SharePostDialog
        postId={post.id}
        open={sharePostDialogOpen}
        onOpenChange={setSharePostDialogOpen}
      >
        <></>
      </SharePostDialog>

      <PostReactionsDialog
        postId={post.id}
        open={reactionsDialogOpen}
        onOpenChange={setReactionsDialogOpen}
        totalCount={totalCount}
      />

      <ShareDialog
        contentType="post"
        contentId={post.id}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentData={{
          content: post.content,
          user_name: profile.name,
          user_avatar: profile.avatar_url || undefined
        }}
      />

      <EditPostDialog
        post={post}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </Card>
  );
};

// ✅ OPTIMISATION: Memoization avec comparaison shallow
export const EnhancedPostCard = memo(EnhancedPostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.updated_at === nextProps.post.updated_at &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count
  );
});
