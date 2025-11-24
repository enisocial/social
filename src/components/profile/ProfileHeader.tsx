import { Camera, MessageSquare, UserPlus, UserMinus, MoreHorizontal, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CoverPhotoEditor } from '@/components/CoverPhotoEditor';
import { AvatarEditor } from '@/components/AvatarEditor';
import { useNavigate } from 'react-router-dom';
import { useMessenger as useMessengerContext } from '@/contexts/MessengerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileHeaderProps {
  profile: any;
  friendsCount: number;
  isOwnProfile: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onProfileUpdate?: () => void;
}

export const ProfileHeader = ({ 
  profile, 
  friendsCount, 
  isOwnProfile, 
  friendshipStatus = 'none',
  onProfileUpdate 
}: ProfileHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendFriendRequest, acceptFriendRequest, cancelFriendRequest } = useFriendRequests();
  const { openBubble } = useMessengerContext();

  const handleSendFriendRequest = async () => {
    if (!user) return;
    try {
      await sendFriendRequest(profile.id);
      toast.success('Demande d\'ami envoyée');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !friendshipStatus) return;
    try {
      // Find the request ID
      const { data } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', profile.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .single();
      
      if (data) {
        await acceptFriendRequest(data.id);
        toast.success('Demande acceptée');
        onProfileUpdate?.();
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirm('Voulez-vous vraiment retirer cet ami ?')) return;
    
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user?.id})`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      toast.success('Ami retiré');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelFriendRequest(profile.id);
      toast.success('Demande annulée');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleOpenChat = async () => {
    if (!user) return;

    try {
      // Find or create conversation with this user
      const { data: existingConv } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations!inner(type)')
        .eq('user_id', user.id)
        .eq('conversations.type', 'dm');

      // Check if conversation with this specific user exists
      let conversationId = null;
      
      if (existingConv && existingConv.length > 0) {
        for (const conv of existingConv) {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('user_id', user.id);
          
          if (otherParticipants?.length === 1 && otherParticipants[0].user_id === profile.id) {
            conversationId = conv.conversation_id;
            break;
          }
        }
      }

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'dm'
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;

        // Add participants
        await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: profile.id }
          ]);
      }

      // Open chat bubble
      openBubble(conversationId, {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar_url: profile.avatar_url
      });

    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Cover Photo */}
      <div className="relative h-[400px] bg-gradient-to-br from-primary/20 to-primary/5">
        {profile.cover_photo_url && (
          <img 
            src={profile.cover_photo_url} 
            alt="Couverture" 
            className="w-full h-full object-cover"
          />
        )}
        {isOwnProfile && (
          <div className="absolute bottom-4 right-4 z-10">
            <CoverPhotoEditor
              currentCover={profile.cover_photo_url}
              userId={profile.id}
              onCoverUpdate={onProfileUpdate || (() => {})}
            />
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-4">
        <div className="flex flex-col md:flex-row gap-4 -mt-20 md:-mt-16">
          {/* Profile Picture */}
          <div className="relative">
            {isOwnProfile ? (
              <AvatarEditor
                currentAvatar={profile.avatar_url}
                userName={profile.name}
                userId={profile.id}
                onAvatarUpdate={onProfileUpdate || (() => {})}
              />
            ) : (
              <Avatar className="h-40 w-40 border-4 border-background">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-4xl">{profile.name?.[0]}</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Name and Actions */}
          <div className="flex-1 mt-16 md:mt-20">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm mt-2 max-w-2xl">{profile.bio}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {friendsCount} ami{friendsCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  {friendshipStatus === 'none' && (
                    <Button onClick={handleSendFriendRequest} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  )}
                  {friendshipStatus === 'pending_sent' && (
                    <Button variant="secondary" onClick={handleCancelRequest} className="gap-2">
                      <X className="h-4 w-4" />
                      Annuler la demande
                    </Button>
                  )}
                  {friendshipStatus === 'pending_received' && (
                    <>
                      <Button onClick={handleAcceptRequest} className="gap-2">
                        <Check className="h-4 w-4" />
                        Accepter
                      </Button>
                      <Button variant="secondary" onClick={handleCancelRequest}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {friendshipStatus === 'friends' && (
                    <>
                      <Button variant="secondary" className="gap-2">
                        <Check className="h-4 w-4" />
                        Amis
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2"
                        onClick={handleOpenChat}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {friendshipStatus === 'friends' && (
                        <DropdownMenuItem onClick={handleRemoveFriend} className="text-destructive">
                          <UserMinus className="h-4 w-4 mr-2" />
                          Retirer des amis
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>Bloquer</DropdownMenuItem>
                      <DropdownMenuItem>Signaler</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};