import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PostStatsProps {
  postId: string;
  totalReactions: number;
  onReactionsClick?: () => void;
  onCommentsClick?: () => void;
  onSharesClick?: () => void;
}

export const PostStats = ({ 
  postId, 
  totalReactions, 
  onReactionsClick,
  onCommentsClick,
  onSharesClick
}: PostStatsProps) => {
  // Fetch commenters
  const { data: commenters } = useQuery({
    queryKey: ['post-commenters', postId],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select(`
          user_id,
          profiles!user_id(id, name, username, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Get unique commenters
      const uniqueCommenters = new Map();
      data?.forEach(comment => {
        if (comment.profiles && !uniqueCommenters.has(comment.user_id)) {
          uniqueCommenters.set(comment.user_id, comment.profiles);
        }
      });
      
      return Array.from(uniqueCommenters.values());
    }
  });

  // Fetch comments count
  const { data: commentsCount = 0 } = useQuery({
    queryKey: ['post-comments-count', postId],
    queryFn: async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return count || 0;
    }
  });

  // Fetch shares count
  const { data: sharesCount = 0 } = useQuery({
    queryKey: ['post-shares-count', postId],
    queryFn: async () => {
      const { count } = await supabase
        .from('post_shares')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return count || 0;
    }
  });

  return (
    <div className="flex items-center justify-between py-2 px-4 text-sm text-muted-foreground border-t">
      {/* Reactions */}
      <div 
        className={`flex items-center gap-2 ${totalReactions > 0 ? 'cursor-pointer hover:underline' : ''}`}
        onClick={totalReactions > 0 ? onReactionsClick : undefined}
      >
        {totalReactions > 0 && (
          <>
            <div className="flex items-center -space-x-1">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                <Heart className="h-3 w-3" fill="currentColor" />
              </div>
            </div>
            <span>{totalReactions}</span>
          </>
        )}
      </div>

      {/* Comments and Shares */}
      <div className="flex items-center gap-3">
        {(commentsCount > 0 || sharesCount > 0) && (
          <>
            {commentsCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:underline"
                      onClick={onCommentsClick}
                    >
                      <span>{commentsCount}</span>
                      <span>{commentsCount === 1 ? 'commentaire' : 'commentaires'}</span>
                    </div>
                  </TooltipTrigger>
                  {commenters && commenters.length > 0 && (
                    <TooltipContent>
                      <div className="space-y-1">
                        {commenters?.slice(0, 3).map((commenter: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={commenter.avatar_url || ''} />
                              <AvatarFallback className="text-xs">{commenter.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{commenter.name}</span>
                          </div>
                        ))}
                        {commenters && commenters.length > 3 && (
                          <div className="text-xs">et {commenters.length - 3} autres...</div>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}

            {sharesCount > 0 && (
              <div 
                className="cursor-pointer hover:underline"
                onClick={onSharesClick}
              >
                {sharesCount} {sharesCount === 1 ? 'partage' : 'partages'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};