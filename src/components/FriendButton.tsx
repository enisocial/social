import { useOptimizedFriendRequests } from '@/hooks/useOptimizedFriendRequests';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useMessenger } from '@/contexts/MessengerContext';
import { UserPlus, UserCheck, Clock, UserMinus, X, Check, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FriendButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetName?: string;
  targetAvatarUrl?: string | null;
}

export function FriendButton({ 
  targetUserId, 
  targetUsername, 
  targetName, 
  targetAvatarUrl 
}: FriendButtonProps) {
  const { user } = useAuth();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendshipStatus,
    receivedRequests,
  } = useOptimizedFriendRequests(); // Use optimized hook
  const { createConversation } = useConversations();
  const { openBubble } = useMessenger();

  // Fetch target user profile if not provided
  const { data: targetProfile } = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, username, avatar_url')
        .eq('id', targetUserId)
        .single();
      return data;
    },
    enabled: !targetName,
  });

  if (!user || user.id === targetUserId) return null;

  const status = getFriendshipStatus(targetUserId);
  const pendingRequest = receivedRequests.find(r => r.sender_id === targetUserId);

  const handleSendMessage = async () => {
    const conversationId = await createConversation(targetUserId);
    if (conversationId) {
      openBubble(conversationId, {
        id: targetUserId,
        name: targetName || targetProfile?.name || targetUsername,
        username: targetUsername,
        avatar_url: targetAvatarUrl ?? targetProfile?.avatar_url ?? null,
      });
    }
  };

  if (status === 'friends') {
    return (
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          onClick={handleSendMessage}
        >
          <MessageCircle className="w-4 h-4" />
          Message
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Amis
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => removeFriend(targetUserId)}
              className="text-destructive cursor-pointer"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Retirer des amis
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (status === 'pending_sent') {
    const { data: sentRequest } = useQuery({
      queryKey: ['sent-request', user?.id, targetUserId],
      queryFn: async () => {
        const { data } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('sender_id', user?.id)
          .eq('receiver_id', targetUserId)
          .eq('status', 'pending')
          .single();
        return data;
      },
      enabled: !!user?.id,
    });

    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          if (sentRequest?.id) {
            cancelFriendRequest(sentRequest.id);
          }
        }}
      >
        <Clock className="w-4 h-4" />
        Demande envoyée
      </Button>
    );
  }

  if (status === 'pending_received' && pendingRequest) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => acceptFriendRequest(pendingRequest.id)}
        >
          <Check className="w-4 h-4" />
          Accepter
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => rejectFriendRequest(pendingRequest.id)}
        >
          <X className="w-4 h-4" />
          Refuser
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      className="gap-2"
      onClick={() => sendFriendRequest(targetUserId)}
    >
      <UserPlus className="w-4 h-4" />
      Ajouter
    </Button>
  );
}
