import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from '@/components/CommentItem';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, ArrowLeft, Trash2, MoreVertical, MapPin, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { ReactionPicker } from '@/components/ReactionPicker';
import { ReactionsSummary } from '@/components/ReactionsSummary';
import { PostReactionsDialog } from '@/components/PostReactionsDialog';
import { SharePostDialog } from '@/components/SharePostDialog';
import { usePostReactions } from '@/hooks/usePostReactions';
import { OptimizedMediaWithCache } from '@/components/ui/OptimizedMediaWithCache';
import { usePostViews } from '@/hooks/usePostViews';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  user_id: string;
  background_color?: string;
  feeling?: string;
  privacy?: string;
  location?: string;
  views_count?: number;
  post_media?: any[];
  post_tags?: any[];
  profiles: {
    username: string;
    name: string;
    avatar_url: string | null;
  };
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const [sharePostDialogOpen, setSharePostDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { comments, loading: commentsLoading, hasMore, addComment, deleteComment, loadMore } = useComments(postId || '');
  const { reactions, userReaction, totalCount, toggleReaction } = usePostReactions(postId || '', user?.id);
  const { viewsData } = usePostViews();

  useEffect(() => {
    if (postId) {
      fetchPost();
      trackView();
    }
  }, [postId]);

  const trackView = async () => {
    if (!postId) return;

    // Utiliser le hook usePostViews pour tracker la vue
    const { trackView } = usePostViews();
    await trackView(postId);
  };

  const fetchPost = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, name, avatar_url),
        post_media (*),
        post_tags (tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username))
      `)
      .eq('id', postId)
      .single();

    if (error || !data) {
      toast.error('Post introuvable');
      navigate('/');
      return;
    }

    setPost(data as Post);
  };

  const handleDelete = async () => {
    if (!user || user.id !== post?.user_id) return;

    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer ce post ?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;

      toast.success('Post supprimé');
      navigate('/feed');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleShowComments = () => {
    // Scroll vers la section commentaires
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    await addComment(commentText);
    setCommentText('');
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const postMedia = post.post_media || [];
  const postTags = post.post_tags || [];
  const profile = {
    username: post.profiles.username || 'unknown',
    name: post.profiles.name || 'Unknown User',
    avatar_url: post.profiles.avatar_url || null
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* HEADER FACEBOOK-STYLE */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Publication
              </h1>
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
                  <DropdownMenuItem onClick={() => toast.info('Modifier - Fonctionnalité à venir')}>
                    Modifier le post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* POST PRINCIPAL - FACEBOOK STYLE */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* HEADER FACEBOOK-STYLE */}
                <CardHeader className="px-4 py-3 pb-2">
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
                              <Link to={`/profile/${tag.tagged_user?.id}`} className="hover:underline font-medium">
                                {tag.tagged_user?.name}
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
                    <div className={`grid gap-2 mt-4 ${
                      postMedia.length === 1 ? 'grid-cols-1' :
                      postMedia.length === 2 ? 'grid-cols-2' :
                      postMedia.length === 3 ? 'grid-cols-2' :
                      postMedia.length === 4 ? 'grid-cols-2' :
                      'grid-cols-3'
                    }`}>
                      {postMedia.slice(0, 6).map((media, idx) => {
                        // Déterminer l'aspect ratio selon le nombre et position
                        let aspectRatio: 'square' | 'video' | 'portrait' | 'auto' = 'square';

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

                        return (
                          <OptimizedMediaWithCache
                            key={`${media.id}-${idx}`}
                            src={mediaUrl}
                            alt={`Média de ${profile.name}`}
                            type={media.media_type === 'video' ? 'video' : 'image'}
                            aspectRatio={aspectRatio}
                            priority={true}
                            quality="high"
                            showControls={media.media_type === 'video'}
                            autoPlay={false}
                            muted={true}
                            className={cn(
                              postMedia.length === 3 && idx === 0 ? 'col-span-2 row-span-2' : '',
                              postMedia.length > 6 && idx === 5 ? 'relative' : ''
                            )}
                          />
                        );
                      }).filter(Boolean)}
                    </div>
                  )}
                </CardContent>

                {/* STATS FACEBOOK-STYLE */}
                {(totalCount > 0 || comments.length > 0 || (viewsData[post.id]?.viewsCount || 0) > 0) && (
                  <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
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
                        {comments.length > 0 && (
                          <button onClick={handleShowComments} className="hover:underline">
                            {comments.length} commentaire{comments.length > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      {/* VUES FACEBOOK-STYLE */}
                      {(viewsData[post.id]?.viewsCount || post.views_count || 0) > 0 && (
                        <button className="flex items-center gap-1 hover:underline text-xs">
                          <Eye className="w-3 h-3" />
                          <span>{viewsData[post.id]?.viewsCount || post.views_count || 0} vue{viewsData[post.id]?.viewsCount !== 1 ? 's' : ''}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* BOUTONS D'ACTION FACEBOOK-STYLE */}
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-0">
                    <ReactionPicker
                      currentReaction={userReaction || null}
                      onSelect={toggleReaction}
                    >
                      <button
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 ${
                          userReaction ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${userReaction ? 'fill-current' : ''}`} />
                        <span className="text-sm font-medium">J'aime</span>
                      </button>
                    </ReactionPicker>

                    <button
                      onClick={handleShowComments}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 text-slate-600 dark:text-slate-400"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Commenter</span>
                    </button>

                    <button
                      onClick={() => setSharePostDialogOpen(true)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-1 text-slate-600 dark:text-slate-400"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Partager</span>
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* SECTION COMMENTAIRES FACEBOOK-STYLE */}
          <div id="comments-section" className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Commentaires ({comments.length})
                  </h2>
                </CardHeader>

                <CardContent className="p-0">
                  {/* ZONE DE SAISIE FACEBOOK-STYLE */}
                  {user && (
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                          <AvatarFallback className="bg-gray-300 text-gray-600 text-xs font-medium">
                            {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder="Écrivez un commentaire..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="min-h-[80px] resize-none bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment();
                              }
                            }}
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={handleAddComment}
                              disabled={!commentText.trim()}
                              size="sm"
                              className="px-4 py-1 text-xs"
                            >
                              Commenter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LISTE DES COMMENTAIRES FACEBOOK-STYLE */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {commentsLoading ? (
                      <div className="p-4 space-y-3">
                        <div className="animate-pulse flex gap-3">
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="animate-pulse flex gap-3">
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                          </div>
                        </div>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Aucun commentaire encore
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Soyez le premier à commenter cette publication !
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <CommentItem
                              comment={comment}
                              currentUserId={user?.id}
                              onDelete={deleteComment}
                              onReply={(text, parentId) => addComment(text, parentId)}
                            />
                          </div>
                        ))}

                        {hasMore && (
                          <div className="p-4 text-center">
                            <Button
                              onClick={loadMore}
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              Voir plus de commentaires
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <PostReactionsDialog
        postId={post.id}
        open={reactionsDialogOpen}
        onOpenChange={setReactionsDialogOpen}
        totalCount={totalCount}
      />

      <SharePostDialog
        postId={post.id}
        open={sharePostDialogOpen}
        onOpenChange={setSharePostDialogOpen}
      />
    </div>
  );
}
