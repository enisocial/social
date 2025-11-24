import { useState, useEffect } from 'react';
import { MessageCircle, Trash2, MoreVertical, Share2, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ShareDialog } from './ShareDialog';
import { SharePostDialog } from './SharePostDialog';
import { ReactionPicker, getReactionEmoji } from './ReactionPicker';
import { ReactionsSummary } from './ReactionsSummary';
import { PostReactionsDialog } from './PostReactionsDialog';
import { usePostReactions } from '@/hooks/usePostReactions';
import { useChatActions } from '@/hooks/useChatActions';
import { EditPostDialog } from './EditPostDialog';
import { AutoplayVideo } from './AutoplayVideo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    created_at: string;
    edited_at?: string;
    edit_history?: Array<{ content: string; edited_at: string }>;
    user_id: string;
    share_count?: number;
    views_count?: number;
    profiles?: {
      username: string;
      name: string;
      avatar_url?: string;
    };
    // Support flat structure from useFeed
    username?: string;
    name?: string;
    avatar_url?: string;
    // Support both array and count formats
    likes?: Array<{ user_id: string }>;
    comments?: Array<{ id: string }>;
    likes_count?: number;
    comments_count?: number;
  };
  onDelete?: () => void;
  sharedBy?: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  shareMessage?: string;
}

export const PostCard = ({ post, onDelete, sharedBy, shareMessage }: PostCardProps) => {
  const { user } = useAuth();
  const { reactions, userReaction, totalCount, toggleReaction } = usePostReactions(post.id, user?.id);
  const { openChatWithUser } = useChatActions();
  const [sharesCount, setSharesCount] = useState(post.share_count || 0);
  const [viewsCount, setViewsCount] = useState(post.views_count || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePostDialogOpen, setSharePostDialogOpen] = useState(false);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);

  // Helper to get profile data (supports both nested and flat structures)
  const getProfile = () => {
    if (post.profiles) {
      return {
        username: post.profiles.username,
        name: post.profiles.name,
        avatar_url: post.profiles.avatar_url
      };
    }
    // Flat structure from useFeed
    return {
      username: (post as any).username || 'unknown',
      name: (post as any).name || 'Unknown User',
      avatar_url: (post as any).avatar_url || null
    };
  };

  const profile = getProfile();

  // Get counts (support both formats)
  const likesCount = post.likes_count ?? post.likes?.length ?? 0;
  const commentsCount = post.comments_count ?? post.comments?.length ?? 0;

  // Fetch view count for videos
  useEffect(() => {
    if (post.media_type === 'video') {
      const fetchViewCount = async () => {
        const { count } = await supabase
          .from('post_views')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (count !== null) {
          setViewsCount(count);
        }
      };
      
      fetchViewCount();
    }
  }, [post.id, post.media_type]);

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);
    
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Post supprimé');
      onDelete?.();
    }
  };

  return (
    <Card className="hover-lift">
      {sharedBy && (
        <div className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="h-4 w-4" />
            <Link 
              to={`/profile/${sharedBy.username}`}
              className="font-medium hover:underline"
            >
              {sharedBy.name}
            </Link>
            <span>a partagé cette publication</span>
          </div>
          {shareMessage && (
            <p className="mt-2 text-sm">{shareMessage}</p>
          )}
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <Link 
            to={`/profile/${profile.username}`} 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <Avatar>
              <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
              <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile.name}</p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </Link>
          
          {user?.id === post.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setEditDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
        
        {post.media_url && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            {post.media_type === 'image' ? (
              <img 
                src={post.media_url} 
                alt="Post media" 
                className="w-full object-cover max-h-[600px]"
              />
            ) : (
              <AutoplayVideo 
                src={post.media_url} 
                className="max-h-[600px] object-contain"
              />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 px-6 py-3 border-t">
        {(totalCount > 0 || commentsCount > 0 || sharesCount > 0) && (
          <div className="w-full flex items-center justify-between pb-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
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
              {sharesCount > 0 && (
                <span>{sharesCount} partage{sharesCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between w-full border-t pt-2">
          <div className="flex gap-2">
            <ReactionPicker onSelect={toggleReaction} currentReaction={userReaction}>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${userReaction ? 'text-primary' : ''}`}
              >
                {userReaction ? (
                  <span className="text-lg">{getReactionEmoji(userReaction)}</span>
                ) : (
                  <span className="text-lg">👍</span>
                )}
                <span className="text-sm">
                  {userReaction ? 'Réagir' : 'J\'aime'}
                </span>
              </Button>
            </ReactionPicker>

            <Link to={`/post/${post.id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">Commenter</span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => setSharePostDialogOpen(true)}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-sm">Partager</span>
            </Button>

            {post.media_type === 'video' && viewsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-sm">{viewsCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardFooter>

      <EditPostDialog
        post={post}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={onDelete}
      />

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
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentType="post"
        contentId={post.id}
        contentData={{
          content: post.content,
          image_url: post.media_url || undefined,
          user_name: profile.name,
          user_avatar: profile.avatar_url || undefined,
        }}
      />
    </Card>
  );
};
