import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { MessageCircle, Trash2, MoreVertical, Share2, Edit, MapPin, Users, Heart, Eye, Clock, Sparkles, Send } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { CommentItem } from '../CommentItem';
import { useComments } from '@/hooks/useComments';
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
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewStartTime = useRef<number>(0);
  const queryClient = useQueryClient();

  // Gestion des commentaires
  const { comments, addComment, deleteComment } = useComments(post.id);

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
    if (!cardRef.current || !user || hasTrackedView) return;

    console.log(`👁️ Setting up view tracking for post ${post.id}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) { // Plus permissif: 30% visible
            // Post devient visible
            viewStartTime.current = Date.now();
            if (!hasTrackedView && onView) {
              console.log(`👁️ Tracking view for post ${post.id}`);
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

  // Gestion des commentaires
  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || !user) return;

    setIsPostingComment(true);
    try {
      await addComment(commentText);
      setCommentText('');
      toast.success('Commentaire ajouté');

      // Invalider le cache pour mettre à jour le compteur de commentaires
      queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setIsPostingComment(false);
    }
  }, [commentText, user, addComment, queryClient]);

  const handleShowComments = useCallback(() => {
    setShowComments(!showComments);
  }, [showComments]);

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

        <Card className="relative flex flex-col bg-gradient-to-br from-white/95 via-slate-50/80 to-gray-50/80 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-700/90 backdrop-blur-xl border-2 border-white/30 dark:border-slate-700/50 hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-500 shadow-lg hover:shadow-2xl rounded-3xl overflow-hidden">
          {/* HEADER ULTRA-MODERNE */}
          <CardHeader className="relative p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {/* AVATAR ANIMÉ */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <Link to={`/profile/${post.user_id}`}>
                    <Avatar className="h-14 w-14 ring-4 ring-white/50 dark:ring-slate-700/50 hover:ring-blue-300/50 dark:hover:ring-blue-600/50 transition-all duration-300">
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg">
                        {profile.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  {/* BADGE EN LIGNE */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-3 border-white dark:border-slate-800 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </motion.div>

                {/* INFOS UTILISATEUR ULTRA-MODERNES */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/profile/${post.user_id}`}>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 text-lg">
                        {profile.name}
                      </h3>
                    </Link>
                    {/* BADGE VÉRIFIÉ */}
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}</span>
                  </div>

                  {/* BADGES CONDITIONNELLES */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.feeling && (
                      <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                        <Heart className="w-3 h-3 mr-1" />
                        se sent {post.feeling}
                      </Badge>
                    )}

                    {post.location && (
                      <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
                        <MapPin className="w-3 h-3 mr-1" />
                        {post.location}
                      </Badge>
                    )}

                    {postTags && postTags.length > 0 && (
                      <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                        <Users className="w-3 h-3 mr-1" />
                        avec {postTags.length} personne{postTags.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* TAGS DÉTAILLÉS */}
                  {postTags && postTags.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <Users className="w-3 h-3" />
                      <span>avec</span>
                      {postTags.slice(0, 3).map((tag, idx) => (
                        <span key={tag.id}>
                          <Link to={`/profile/${tag.tagged_user_id}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                            {tag.tagged_user.name}
                          </Link>
                          {idx < Math.min(postTags.length, 3) - 1 && ', '}
                        </span>
                      ))}
                      {postTags.length > 3 && (
                        <span className="text-slate-400 dark:text-slate-500">
                          et {postTags.length - 3} autre{postTags.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MENU ULTRA-MODERNE */}
              {user?.id === post.user_id && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-200"
                      >
                        <MoreVertical className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-2">
                      <DropdownMenuItem
                        onClick={() => setEditDialogOpen(true)}
                        className="rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer px-4 py-3"
                      >
                        <Edit className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Modifier le post</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer px-4 py-3 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        <span className="font-medium">Supprimer</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}
            </div>
          </CardHeader>

          <CardContent className="relative px-6 space-y-4 pb-4">
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

          {/* FOOTER ULTRA-MODERNE AVEC ACTIONS TOUJOURS VISIBLES */}
          <div className="relative px-6 py-4 bg-gradient-to-r from-slate-50/80 to-blue-50/60 dark:from-slate-800/80 dark:to-slate-700/60 rounded-b-3xl border-t border-slate-200/60 dark:border-slate-700/60 min-h-[70px] flex items-center">
            <div className="flex items-center justify-between w-full">
              {/* BOUTONS D'ACTION ULTRA-MODERNES - TOUJOURS VISIBLES */}
              <div className="flex items-center gap-2 flex-wrap">
                <ReactionPicker
                  currentReaction={userReaction || null}
                  onSelect={toggleReaction}
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                        userReaction
                          ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105'
                          : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-950/30 dark:hover:to-cyan-950/30'
                      }`}
                    >
                      <Heart className={`h-4 w-4 transition-all duration-300 ${
                        userReaction ? 'text-white fill-white scale-110 animate-pulse' : 'text-slate-500 group-hover:text-blue-500 group-hover:scale-110'
                      }`} />
                      <span className={`font-semibold text-sm transition-all duration-200 ${
                        userReaction ? 'text-white' : 'text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {totalCount > 0 ? totalCount : 'J\'aime'}
                      </span>
                      {userReaction && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-blue-500/20 rounded-2xl animate-pulse"></div>
                      )}
                    </Button>
                  </motion.div>
                </ReactionPicker>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShowComments}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-950/30 dark:hover:to-cyan-950/30 transition-all duration-300 group"
                  >
                    <MessageCircle className="h-4 w-4 text-slate-500 group-hover:text-blue-500 transition-all duration-300 group-hover:scale-110" />
                    <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                      {commentsCount > 0 ? commentsCount : 'Commenter'}
                    </span>
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 transition-all duration-300 group"
                    onClick={() => setSharePostDialogOpen(true)}
                  >
                    <Share2 className="h-4 w-4 text-slate-500 group-hover:text-emerald-500 transition-all duration-300 group-hover:scale-110" />
                    <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                      {post.share_count > 0 ? post.share_count : 'Partager'}
                    </span>
                  </Button>
                </motion.div>
              </div>

              {/* INDICATEUR DE VUES MODERNE */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 px-3 py-2 rounded-2xl backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="font-semibold">{post.views_count || 0}</span>
              </motion.div>
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

        {/* SECTION COMMENTAIRES ULTRA-MODERNE - Comme Facebook */}
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-4"
          >
            <Card className="bg-gradient-to-br from-white/95 via-blue-50/80 to-indigo-50/80 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-600/90 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-700/50 rounded-3xl shadow-xl overflow-hidden">
              {/* ZONE DE SAISIE DE COMMENTAIRE */}
              {user && (
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                        {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder="Écrivez un commentaire..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[80px] resize-none bg-white/70 dark:bg-slate-700/70 border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit();
                          }
                        }}
                      />

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Appuyez sur Entrée pour publier
                        </div>

                        <Button
                          onClick={handleCommentSubmit}
                          disabled={!commentText.trim() || isPostingComment}
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {isPostingComment ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Publication...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              <span>Commenter</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}

              {/* LISTE DES COMMENTAIRES */}
              {comments.length > 0 && (
                <div className="border-t border-slate-200/50 dark:border-slate-700/50">
                  <div className="max-h-96 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-slate-100/50 dark:border-slate-700/30 last:border-b-0">
                        <CommentItem
                          comment={comment}
                          currentUserId={user?.id}
                          onDelete={deleteComment}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ÉTAT VIDE - Aucun commentaire */}
              {comments.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageCircle className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Aucun commentaire encore
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Soyez le premier à commenter cette publication !
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
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
