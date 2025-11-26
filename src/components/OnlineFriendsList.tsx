import { useAuth } from '@/hooks/useAuth';
import { useChatActions } from '@/hooks/useChatActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { memo, useCallback } from 'react';
import { useOnlineFriends } from '@/hooks/useOnlineFriends';
import { useUnreadMessages } from '@/contexts/UnreadContext';

interface OnlineFriendsListProps {
  userId: string;
}

const OnlineFriendItem = memo(({ friend, onClick }: { friend: any; onClick: () => void }) => {
  const isMobile = useIsMobile();
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg hover:bg-accent/60 transition-all duration-150 group active:scale-[0.98] ${
        isMobile ? 'p-3' : 'p-2'
      }`}
    >
      <div className="relative">
        <Avatar className={isMobile ? "h-12 w-12" : "h-10 w-10"}>
          <AvatarImage src={friend.avatar_url || ''} alt={friend.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {friend.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {friend.online && (
          <div className={`absolute bottom-0 right-0 bg-green-500 border-2 border-card rounded-full ${
            isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'
          }`} />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`font-medium truncate group-hover:text-primary transition-colors ${
          isMobile ? 'text-base' : 'text-sm'
        }`}>
          {friend.name}
        </p>
        <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
          {friend.online ? (
            <span className="text-green-600 dark:text-green-400 font-medium">En ligne</span>
          ) : (
            <span className="truncate block">
              Actif {formatDistanceToNow(new Date(friend.last_seen), { 
                addSuffix: true,
                locale: fr 
              })}
            </span>
          )}
        </p>
      </div>
      {friend.unread_count > 0 && (
        <Badge 
          variant="destructive" 
          className={`rounded-full flex items-center justify-center ${
            isMobile ? 'h-6 min-w-6 px-2 text-sm' : 'h-5 min-w-5 px-1.5 text-xs'
          }`}
        >
          {friend.unread_count > 99 ? '99+' : friend.unread_count}
        </Badge>
      )}
    </button>
  );
});

OnlineFriendItem.displayName = 'OnlineFriendItem';

export const OnlineFriendsList = memo(({ userId }: OnlineFriendsListProps) => {
  const { user } = useAuth();
  const { onlineFriends, loading } = useOnlineFriends(user?.id);
  const { openChatWithUser } = useChatActions();
  const { conversationUnreads } = useUnreadMessages();
  const isMobile = useIsMobile();

  const handleChatOpen = useCallback((friend: typeof onlineFriends[0]) => {
    // Pass full userInfo to skip fetch - INSTANT
    openChatWithUser(friend.id, {
      name: friend.name,
      username: friend.username,
      avatar_url: friend.avatar_url
    });
  }, [openChatWithUser]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (onlineFriends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Aucun ami en ligne
      </p>
    );
  }

  return (
    <ScrollArea className={isMobile ? "h-[calc(100vh-180px)]" : "h-[calc(100vh-200px)]"}>
      <div className="space-y-0.5">
        {onlineFriends.map((friend) => {
          // Get unread count from the centralized context using conversation_id
          // If conversation_id is not available (not created yet), count is 0
          const unreadCount = friend.conversation_id 
            ? (conversationUnreads.get(friend.conversation_id) || 0)
            : 0;

          return (
            <OnlineFriendItem
              key={friend.id}
              friend={{ ...friend, unread_count: unreadCount }}
              onClick={() => handleChatOpen(friend)}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
});

OnlineFriendsList.displayName = 'OnlineFriendsList';
