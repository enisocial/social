import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Share2, Users, UserPlus, MessageCircle } from 'lucide-react';
import { usePostShares } from '@/hooks/usePostShares';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SharePostDialogProps {
  postId: string;
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SharePostDialog = ({ postId, children, open, onOpenChange }: SharePostDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shareMessage, setShareMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState('profile');
  const { sharePost, isSharing } = usePostShares(postId);
  const { createConversation } = useConversations();

  // Get friends list
  const { data: friends } = useQuery({
    queryKey: ['friends-list', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select(`
          sender_id,
          receiver_id,
          sender:profiles!sender_id(id, name, username, avatar_url),
          receiver:profiles!receiver_id(id, name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      return friendRequests?.map(fr => 
        fr.sender_id === user.id ? fr.receiver : fr.sender
      ) || [];
    },
    enabled: !!user && open,
  });

  // Get groups list
  const { data: groups } = useQuery({
    queryKey: ['user-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, avatar_url)')
        .eq('user_id', user.id);

      return data?.map(gm => gm.groups).filter(Boolean) || [];
    },
    enabled: !!user && open,
  });

  const handleShare = (type: 'profile' | 'friend' | 'group', targetId?: string) => {
    sharePost(
      {
        postId,
        shareType: type,
        shareMessage: shareMessage.trim() || undefined,
        ...(type === 'friend' && { sharedWithUserId: targetId }),
        ...(type === 'group' && { sharedWithGroupId: targetId }),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setShareMessage('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager la publication
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="message" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Message
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" />
              Groupes
            </TabsTrigger>
            <TabsTrigger value="friend" className="gap-2">
              <Users className="h-4 w-4" />
              Amis
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <Textarea
              placeholder="Ajouter un message (optionnel)..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
              className="mb-4"
            />
          </div>

          <TabsContent value="profile" className="mt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Partager cette publication sur votre journal personnel
              </p>
              <Button
                onClick={() => handleShare('profile')}
                disabled={isSharing}
                className="w-full"
              >
                Partager sur mon journal
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="message" className="mt-0">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {friends && friends.length > 0 ? (
                friends.map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>{friend.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const conversationId = await createConversation(friend.id);
                        if (conversationId) {
                          onOpenChange(false);
                          navigate(`/messages?conversation=${conversationId}&sharePost=${postId}`);
                          toast.success('Redirection vers la conversation');
                        }
                      }}
                      disabled={isSharing}
                    >
                      Envoyer
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun ami trouvé
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="friend" className="mt-0">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {friends && friends.length > 0 ? (
                friends.map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>{friend.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleShare('friend', friend.id)}
                      disabled={isSharing}
                    >
                      Partager
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun ami trouvé
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="group" className="mt-0">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {groups && groups.length > 0 ? (
                groups.map((group: any) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={group.avatar_url || ''} />
                        <AvatarFallback>{group.name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{group.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleShare('group', group.id)}
                      disabled={isSharing}
                    >
                      Partager
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun groupe trouvé
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
