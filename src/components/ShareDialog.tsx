import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Share2, MessageSquare, User, Users, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'photo' | 'live';
  contentId: string;
  contentData?: {
    content?: string;
    image_url?: string;
    title?: string;
    user_name?: string;
    user_avatar?: string;
  };
}

export const ShareDialog = ({ 
  open, 
  onOpenChange, 
  contentType, 
  contentId,
  contentData 
}: ShareDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shareMessage, setShareMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Récupérer les conversations
  const { data: conversations } = useQuery({
    queryKey: ['conversations-for-share', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participantData) return [];

      const conversationIds = participantData.map(p => p.conversation_id);

      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          profiles:user_id (id, username, name, avatar_url)
        `)
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id);

      return conversations?.reduce((acc: any[], curr) => {
        const existingConv = acc.find(c => c.conversation_id === curr.conversation_id);
        if (!existingConv) {
          acc.push(curr);
        }
        return acc;
      }, []);
    },
    enabled: !!user && open,
  });

  // Récupérer les amis
  const { data: friends } = useQuery({
    queryKey: ['friends-for-share', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data } = await supabase
        .from('friend_requests')
        .select(`
          sender_id,
          receiver_id,
          sender:profiles!friend_requests_sender_id_fkey(id, username, name, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, username, name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      return data?.map(req => {
        const friend = req.sender_id === user.id ? req.receiver : req.sender;
        return friend;
      });
    },
    enabled: !!user && open,
  });

  const shareToProfile = useMutation({
    mutationFn: async () => {
      if (!user || contentType !== 'post') return;

      const { error } = await supabase
        .from('post_shares')
        .insert({
          post_id: contentId,
          shared_by: user.id,
          share_type: 'profile',
          share_message: shareMessage || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      toast({
        title: "Partagé !",
        description: "Le contenu a été partagé sur votre profil",
      });
      onOpenChange(false);
      setShareMessage("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de partager le contenu",
        variant: "destructive",
      });
    },
  });

  const shareToUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) return;

      // Créer ou récupérer la conversation
      let conversationId: string;

      const { data: existingConv } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const existingConvIds = existingConv?.map(c => c.conversation_id) || [];

      if (existingConvIds.length > 0) {
        const { data: targetConv } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', existingConvIds)
          .single();

        if (targetConv) {
          conversationId = targetConv.conversation_id;
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({})
            .select()
            .single();

          conversationId = newConv!.id;

          await supabase.from('conversation_participants').insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: targetUserId },
          ]);
        }
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({})
          .select()
          .single();

        conversationId = newConv!.id;

        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: targetUserId },
        ]);
      }

      // Créer le message avec le contenu partagé
      let messageContent = shareMessage || "Contenu partagé";
      
      if (contentType === 'post' && contentData) {
        messageContent += `\n\n📝 Post partagé :\n"${contentData.content?.substring(0, 100)}${contentData.content && contentData.content.length > 100 ? '...' : ''}"`;
      } else if (contentType === 'photo' && contentData) {
        messageContent += `\n\n📷 Photo partagée`;
      } else if (contentType === 'live' && contentData) {
        messageContent += `\n\n🔴 Live partagé : ${contentData.title}`;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
        });

      if (error) throw error;

      // Enregistrer le partage si c'est un post
      if (contentType === 'post') {
        await supabase.from('post_shares').insert({
          post_id: contentId,
          shared_by: user.id,
          share_type: 'message',
          share_message: shareMessage || null,
          shared_with_user_id: targetUserId,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Envoyé !",
        description: "Le contenu a été partagé en message",
      });
      onOpenChange(false);
      setShareMessage("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    },
  });

  const filteredFriends = friends?.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Partager</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Sur mon profil
            </TabsTrigger>
            <TabsTrigger value="message" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              En message
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            {contentType === 'post' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ajouter un commentaire (optionnel)
                  </label>
                  <Textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Qu'en pensez-vous ?"
                    rows={3}
                  />
                </div>

                {contentData && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={contentData.user_avatar} />
                        <AvatarFallback>{contentData.user_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{contentData.user_name}</span>
                    </div>
                    <p className="text-sm line-clamp-3">{contentData.content}</p>
                    {contentData.image_url && (
                      <img 
                        src={contentData.image_url} 
                        alt="Post" 
                        className="mt-2 rounded-lg max-h-48 object-cover"
                      />
                    )}
                  </div>
                )}

                <Button 
                  onClick={() => shareToProfile.mutate()} 
                  className="w-full"
                  disabled={shareToProfile.isPending}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager sur mon profil
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Le partage sur profil n'est disponible que pour les posts
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="message" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Message (optionnel)
              </label>
              <Textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Ajouter un message..."
                rows={2}
              />
            </div>

            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un ami..."
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredFriends?.map((friend: any) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => shareToUser.mutate(friend.id)}
                        disabled={shareToUser.isPending}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Envoyer
                      </Button>
                    </div>
                  ))}

                  {filteredFriends?.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Aucun ami trouvé</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
