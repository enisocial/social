import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2, MoreVertical, Share2, ThumbsUp, Edit, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ShareDialog } from './ShareDialog';
import { ReactionPicker, getReactionEmoji } from './ReactionPicker';
import { ReactionsSummary } from './ReactionsSummary';
import { usePostReactions } from '@/hooks/usePostReactions';
import { useChatActions } from '@/hooks/useChatActions';
import { EditPostDialog } from './EditPostDialog';
import { OptimizedMediaWithCache } from '@/components/ui/OptimizedMediaWithCache';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SmartPostCardProps {
  post: {
    id: string;
    content: string;
    media_url?: string | null;
    media_type?: 'image' | 'video' | null;
    created_at: string;
    user_id: string;
    username: string;
    name: string;
    avatar_url?: string | null;
    likes_count: number;
    comments_count: number;
    shares_count?: number;
    views_count?: number;
    user_liked: boolean;
    relevance_score?: number;
    engagement_prediction?: number;
    final_score?: number;
  };
  onDelete?: () => void;
  onView?: (postId: string) => void;
  onClick?: (postId: string) => void;
  onTimeSpent?: (postId: string, seconds: number) => void;
  onReaction?: (postId: string) => void;
}

export const SmartPostCard = ({ post, onDelete, onView, onClick, onTimeSpent, onReaction }: SmartPostCardProps) => {
  const { user } = useAuth();
  const { reactions, userReaction, totalCount, toggleReaction } = usePostReactions(post.id, user?.id);
  const { openChatWithUser } = useChatActions();
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [viewsCount, setViewsCount] = useState(post.views_count || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewStartTime = useRef<number>(0);
  const isMobile = useIsMobile();

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

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      setIsDeleting(false);
    } else {
      toast.success('Post supprimé');
      onDelete?.();
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(post.id);
    }
  };

  // Track video view
  const trackVideoView = async () => {
    if (!user || post.media_type !== 'video') return;

    try {
      const { error } = await supabase.from('post_views').insert({
        post_id: post.id,
        viewer_id: user.id
      });
      if (!error) {
        setViewsCount(prev => prev + 1);
      }
    } catch (error) {
      // Ignore duplicate key errors
    }
  };

  return (
    <Card ref={cardRef} className="hover-lift shadow-md border-border/50" onClick={handleCardClick}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Link 
            to={`/profile/${post.username}`} 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.avatar_url || ''} alt={post.name} />
              <AvatarFallback>{post.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{post.name}</p>
              <p className="text-sm text-muted-foreground">@{post.username}</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Score de pertinence (visible en debug) */}
            {post.final_score !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(post.final_score)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p>Score final: {Math.round(post.final_score)}</p>
                      <p>Pertinence: {Math.round(post.relevance_score || 0)}</p>
                      <p>Engagement prédit: {Math.round(post.engagement_prediction || 0)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {user?.id === post.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
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
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-foreground">{post.content}</p>
        
        {post.media_url && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <OptimizedMediaWithCache
              src={post.media_url}
              alt="Post media"
              type={post.media_type as 'image' | 'video'}
              aspectRatio="auto"
              quality={isMobile ? 'low' : 'medium'}
              className={isMobile ? 'max-h-[300px]' : 'max-h-[600px]'}
              showControls={post.media_type === 'video'}
              autoPlay={post.media_type === 'video' && !isMobile} // Désactiver autoplay sur mobile (browsers bloquent souvent)
              muted={true}
              onClick={() => {
                if (post.media_type === 'video') {
                  trackVideoView();
                }
              }}
            />
            {post.media_type === 'video' && viewsCount > 0 && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {viewsCount.toLocaleString()} {viewsCount === 1 ? 'vue' : 'vues'}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 px-6 py-3 border-t">
        {totalCount > 0 && (
          <div className="w-full flex items-center justify-between pb-2">
            <ReactionsSummary reactions={reactions} totalCount={totalCount} />
          </div>
        )}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <ReactionPicker 
              onSelect={(reaction) => {
                toggleReaction(reaction);
                if (!userReaction && onReaction) {
                  onReaction(post.id);
                }
              }} 
              currentReaction={userReaction}
            >
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${userReaction ? 'text-primary' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                {userReaction ? (
                  <span className="text-lg">{getReactionEmoji(userReaction)}</span>
                ) : (
                  <ThumbsUp className="h-5 w-5" />
                )}
                <span className="text-sm">
                  {post.likes_count > 0 ? post.likes_count : (userReaction ? getReactionEmoji(userReaction) : 'J\'aime')}
                </span>
              </Button>
            </ReactionPicker>

            <Link to={`/post/${post.id}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{post.comments_count}</span>
              </Button>
            </Link>

            {user && user.id !== post.user_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  openChatWithUser(post.user_id, {
                    name: post.name,
                    username: post.username,
                    avatar_url: post.avatar_url
                  });
                }}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">Message</span>
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setShareDialogOpen(true);
              }}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-sm">{sharesCount}</span>
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
        post={post as any}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={onDelete}
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentType="post"
        contentId={post.id}
        contentData={{
          content: post.content,
          image_url: post.media_url || undefined,
          user_name: post.name,
          user_avatar: post.avatar_url || undefined,
        }}
      />
    </Card>
  );
};
