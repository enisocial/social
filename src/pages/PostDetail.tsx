import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from '@/components/CommentItem';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  user_id: string;
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
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { comments, loading: commentsLoading, hasMore, addComment, deleteComment, loadMore } = useComments(postId || '');

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchLikes();
      trackView();
    }
  }, [postId]);

  const trackView = async () => {
    if (!postId || !user) return;

    // Record the view
    await supabase
      .from('post_views')
      .insert({
        post_id: postId,
        viewer_id: user.id,
      })
      .select()
      .single();
  };

  const fetchPost = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, name, avatar_url)
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

  const fetchLikes = async () => {
    if (!postId) return;

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', postId);

    setLikesCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data);
    }
  };

  const toggleLike = async () => {
    if (!user || !postId) return;

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id });

      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    await addComment(commentText);
    setCommentText('');
  };

  const handleAddReply = async (text: string, parentCommentId: string) => {
    await addComment(text, parentCommentId);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  if (!post) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>

      <Card className="p-6 mb-6 bg-card border-border">
        <div className="flex items-start gap-3 mb-4">
          <Avatar
            className="cursor-pointer border-2 border-primary/20"
            onClick={() => navigate(`/profile/${post.profiles.username}`)}
          >
            <AvatarImage src={post.profiles.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.profiles.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold text-foreground cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${post.profiles.username}`)}
              >
                {post.profiles.name}
              </h3>
              <span className="text-muted-foreground">@{post.profiles.username}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>

        <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

        {post.media_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            {post.media_type === 'image' ? (
              <img src={post.media_url} alt="Post media" className="w-full" />
            ) : (
              <video src={post.media_url} controls className="w-full" />
            )}
          </div>
        )}

        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <button
            onClick={toggleLike}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            <span>{comments.length}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6 bg-card border-border">
        <h3 className="font-semibold text-foreground mb-4">Ajouter un commentaire</h3>
        <div className="flex gap-3">
          <Avatar className="border-2 border-primary/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.user_metadata?.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Écrivez votre commentaire..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddComment} disabled={!commentText.trim()}>
              Commenter
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">
          Commentaires ({comments.length})
        </h3>

        {commentsLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        ) : comments.length === 0 ? (
          <Card className="p-6 text-center bg-card border-border">
            <p className="text-muted-foreground">Aucun commentaire pour le moment</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {comments.map((comment) => (
                <Card key={comment.id} className="overflow-hidden bg-card border-border">
                  <CommentItem
                    comment={comment}
                    currentUserId={user?.id}
                    onDelete={handleDeleteComment}
                    onReply={handleAddReply}
                  />
                </Card>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button onClick={loadMore} variant="outline">
                  Charger plus de commentaires
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
