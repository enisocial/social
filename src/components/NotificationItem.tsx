import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle, UserPlus, MessageSquare, Tag, Share2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

export const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const navigate = useNavigate();

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationText = () => {
    const senderName = notification.sender?.name || 'Un utilisateur';
    
    switch (notification.type) {
      case 'like':
        if (notification.metadata?.reaction_type && notification.metadata.reaction_type !== 'like') {
          return `${senderName} a réagi à votre publication`;
        }
        return `${senderName} a aimé votre publication`;
      case 'comment':
        if (notification.metadata?.is_reply) {
          return `${senderName} a répondu à votre commentaire`;
        }
        return `${senderName} a commenté votre publication`;
      case 'follow':
        if (notification.metadata?.request_id) {
          if (notification.metadata?.accepted) {
            return `${senderName} a accepté votre demande d'ami`;
          }
          return `${senderName} vous a envoyé une demande d'ami`;
        }
        return `${senderName} a commencé à vous suivre`;
      case 'message':
        return `${senderName} vous a envoyé un message`;
      default:
        return `${senderName} a interagi avec vous`;
    }
  };

  const handleClick = () => {
    // Mark as read
    if (!notification.read) {
      onRead(notification.id);
    }

    // Navigate to relevant content
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.comment_id) {
      navigate(`/post/${notification.metadata?.post_id}`);
    } else if (notification.type === 'follow') {
      if (notification.metadata?.request_id) {
        navigate('/find-friends');
      } else {
        navigate(`/profile/${notification.sender?.username}`);
      }
    } else if (notification.type === 'message') {
      navigate('/messages');
    } else if (notification.sender) {
      navigate(`/profile/${notification.sender.username}`);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Avatar with icon badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={notification.sender?.avatar_url} />
          <AvatarFallback>
            {notification.sender?.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border-2 border-background">
          {getNotificationIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{notification.sender?.name}</span>
          {' '}
          <span className="text-muted-foreground">
            {getNotificationText().replace(notification.sender?.name || '', '').trim()}
          </span>
        </p>
        
        {notification.content_preview && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {notification.content_preview}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {!notification.read && (
            <div className="h-2 w-2 bg-primary rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};
