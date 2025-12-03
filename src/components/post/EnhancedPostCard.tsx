import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { MessageCircle, Trash2, MoreVertical, Share2, Edit, MapPin, Users, Heart, Eye, Clock, Sparkles, Send } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
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

import { usePostViews } from '@/hooks/usePostViews';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  // Gestion des vues
  const { viewsData, trackView } = usePostViews();

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

  // Track view quand le post est visible - COMPTEUR DE VUES RÉEL
  useEffect(() => {
    if (!cardRef.current || hasTrackedView) return;

    console.log(`👁️ Setting up view tracking for post ${post.id}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) { // Plus permissif: 30% visible
            // Post devient visible
            viewStartTime.current = Date.now();
            if (!hasTrackedView) {
              console.log(`👁️ Tracking view for post ${post.id}`);
              // Track view avec le hook usePostViews
              trackView(post.id);
              if (onView) onView(post.id);
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
      { threshold: [0.3, 0.5, 0.7] } // Multiples seuils pour plus de précision
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
  }, [hasTrackedView, onView, onTimeSpent, post.id, trackView]);

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



  const navigate = useNavigate();

  const handleShowComments = useCallback(() => {
    // Rediriger vers la page de détails du post pour voir tous les commentaires
    navigate(`/post/${post.id}`);
  }, [navigate, post.id]);

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative group mb-2"
      >
        {/* FOND ANIMÉ ULTRA-MODERNE */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-400/20 via-cyan-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-rose-400/20 rounded-full blur-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ animationDelay: '1s' }}></div>
        </div>

        <Card className="relative flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden">
          {/* HEADER FACEBOOK-STYLE */}
          <CardHeader className="px-4 py-3 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* AVATAR FACEBOOK-STYLE */}
                <Link to={`/profile/${post.user_id}`}>
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-gray-300 text-gray-600 text-sm font-medium">
                      {profile.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                {/* INFOS UTILISATEUR FACEBOOK-STYLE */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link to={`/profile/${post.user_id}`}>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 hover:underline text-sm">
                        {profile.name}
                      </span>
                    </Link>
                    {post.feeling && (
                      <span className="text-slate-600 dark:text-slate-400 text-sm">
                        se sent {post.feeling}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}</span>
                    {post.privacy && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span>🌐</span>
                          {post.privacy}
                        </span>
                      </>
                    )}
                  </div>

                  {/* TAGS FACEBOOK-STYLE */}
                  {postTags && postTags.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <span>avec</span>
                      {postTags.slice(0, 3).map((tag, idx) => (
                        <span key={tag.id}>
                          <Link to={`/profile/${tag.tagged_user_id}`} className="hover:underline font-medium">
                            {tag.tagged_user.name}
                          </Link>
                          {idx < Math.min(postTags.length, 3) - 1 && ', '}
                        </span>
                      ))}
                      {postTags.length > 3 && (
                        <span className="text-slate-500 dark:text-slate-500">
                          et {postTags.length - 3} autre{postTags.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {post.location && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{post.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* MENU FACEBOOK-STYLE */}
              {user?.id === post.user_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier le post
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-3">
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


        </CardContent>

          {/* ACTIONS FACEBOOK-STYLE */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
            {/* STATS FACEBOOK-STYLE */}
            {(totalCount > 0 || commentsCount > 0 || post.share_count > 0) && (
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
                <div className="flex items-center gap-2">
                  {totalCount > 0 && (
                    <button
                      onClick={() => setReactionsDialogOpen(true)}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <span className="w-4 h-4 bg-gradient-to-r from-blue-500 to-red-500 rounded-full flex items-center justify-center">
                        <Heart className="w-2.5 h-2.5 text-white" />
                      </span>
                      <span>{totalCount}</span>
                    </button>
                  )}
                  {commentsCount > 0 && (
                    <Link to={`/post/${post.id}`} className="hover:underline">
                      {commentsCount} commentaire{commentsCount > 1 ? 's' : ''}
                    </Link>
                  )}
                  {post.share_count > 0 && (
                    <span>{post.share_count} partage{post.share_count > 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* VUES FACEBOOK-STYLE */}
                {(viewsData[post.id]?.viewsCount || post.views_count || 0) > 0 && (
                  <button className="flex items-center gap-1 hover:underline text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{viewsData[post.id]?.viewsCount || post.views_count || 0}</span>
                  </button>
                )}
              </div>
            )}

            {/* BOUTONS D'ACTION FACEBOOK-STYLE */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-0 flex-1">
                <ReactionPicker
                  currentReaction={userReaction || null}
                  onSelect={toggleReaction}
                >
                  <button
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 ${
                      userReaction ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${userReaction ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">J'aime</span>
                  </button>
                </ReactionPicker>

                <button
                  onClick={handleShowComments}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 text-slate-600 dark:text-slate-400"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Commenter</span>
                </button>

                <button
                  onClick={() => setSharePostDialogOpen(true)}
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 text-slate-600 dark:text-slate-400"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Partager</span>
                </button>
              </div>
            </div>
          </div>



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
    </motion.div>
    </>
  );
  };

// ✅ OPTIMISATION: Memoization avec comparaison shallow incluant views_count
export const EnhancedPostCard = memo(EnhancedPostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.updated_at === nextProps.post.updated_at &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.views_count === nextProps.post.views_count
  );
});
