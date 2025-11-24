import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, MessageCircle, ChevronDown, ChevronUp, ThumbsUp, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCommentReactions } from '@/hooks/useCommentReactions';
import { useChatActions } from '@/hooks/useChatActions';
import { ReactionPicker, getReactionEmoji } from './ReactionPicker';
import { ReactionsSummary } from './ReactionsSummary';
import { EditCommentDialog } from './EditCommentDialog';
import { Link } from 'react-router-dom';

interface CommentItemProps {
  comment: {
    id: string;
    text: string;
    created_at: string;
    user_id: string;
    like_count?: number;
    reply_count?: number;
    edited_at?: string;
    edit_history?: Array<{ text: string; edited_at: string }>;
    replies?: any[];
    profiles: {
      username: string;
      name: string;
      avatar_url: string | null;
    };
  };
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
  onReply?: (text: string, parentCommentId: string) => void;
  isReply?: boolean;
}

export const CommentItem = ({ comment, currentUserId, onDelete, onReply, isReply = false }: CommentItemProps) => {
  const { reactions, userReaction, totalCount, toggleReaction } = useCommentReactions(comment.id, currentUserId);
  const { openChatWithUser } = useChatActions();
  const isOwner = currentUserId === comment.user_id;
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleReply = () => {
    if (!replyText.trim() || !onReply) return;
    onReply(replyText, comment.id);
    setReplyText('');
    setShowReplyForm(false);
  };

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3 p-4 hover:bg-muted/50 rounded-lg transition-colors">
        <Link to={`/profile/${comment.profiles.username}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={comment.profiles.avatar_url || ''} />
            <AvatarFallback>
              {comment.profiles.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 space-y-2">
          <div className="bg-muted/50 rounded-lg p-3">
            <Link 
              to={`/profile/${comment.profiles.username}`}
              className="font-semibold hover:underline"
            >
              {comment.profiles.name}
            </Link>
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
          </div>

          <div className="flex items-center gap-4 px-2 flex-wrap">
            <ReactionPicker onSelect={toggleReaction} currentReaction={userReaction}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-auto p-0 hover:bg-transparent ${
                  userReaction ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {userReaction ? (
                  <span className="text-base">{getReactionEmoji(userReaction)}</span>
                ) : (
                  <ThumbsUp className="h-4 w-4" />
                )}
                {totalCount > 0 && (
                  <span className="text-xs ml-1">{totalCount}</span>
                )}
              </Button>
            </ReactionPicker>

            {totalCount > 0 && (
              <div className="flex items-center">
                <ReactionsSummary reactions={reactions} totalCount={totalCount} />
              </div>
            )}

            {!isReply && onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="h-auto p-0 text-muted-foreground hover:bg-transparent"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Répondre</span>
              </Button>
            )}

            {!isOwner && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openChatWithUser(comment.user_id, {
                  name: comment.profiles.name,
                  username: comment.profiles.username,
                  avatar_url: comment.profiles.avatar_url
                })}
                className="h-auto p-0 text-muted-foreground hover:bg-transparent"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Message</span>
              </Button>
            )}

            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: fr,
              })}
              {comment.edited_at && (
                <span className="ml-2">(modifié)</span>
              )}
            </span>

            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="h-auto p-0 text-muted-foreground hover:bg-transparent"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                    className="h-auto p-0 text-muted-foreground hover:text-destructive hover:bg-transparent ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder="Écrivez votre réponse..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleReply} size="sm" disabled={!replyText.trim()}>
                  Répondre
                </Button>
                <Button onClick={() => setShowReplyForm(false)} variant="ghost" size="sm">
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditCommentDialog
        comment={comment}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Display replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="ml-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="gap-2 text-muted-foreground mb-2"
          >
            {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="text-xs">
              {comment.reply_count || comment.replies.length} {comment.reply_count === 1 ? 'réponse' : 'réponses'}
            </span>
          </Button>
          
          {showReplies && (
            <div className="space-y-1 mt-1">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
