import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveDuo } from "@/hooks/useLiveDuo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DuoInvitePanelProps {
  streamId: string;
}

export const DuoInvitePanel = ({ streamId }: DuoInvitePanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { inviteToDuo, duoInvitation } = useLiveDuo(streamId);

  // Fetch friends
  const { data: friends } = useQuery({
    queryKey: ['friends-for-duo', searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          sender_id,
          receiver_id,
          sender:sender_id!friend_requests_sender_id_fkey(id, name, avatar_url),
          receiver:receiver_id!friend_requests_receiver_id_fkey(id, name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) throw error;

      const friendsList = data.map(fr => {
        const friend = fr.sender_id === user.id ? fr.receiver : fr.sender;
        return friend as any;
      });

      if (searchQuery) {
        return friendsList.filter((f: any) => 
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return friendsList;
    },
    enabled: isOpen,
  });

  const handleInvite = (friendId: string) => {
    inviteToDuo.mutate(friendId);
    setIsOpen(false);
  };

  if (duoInvitation?.status === 'accepted') {
    return null; // Hide button when duo is active
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="rounded-full bg-blue-500 hover:bg-blue-600"
      >
        <Users className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh]"
            >
              <Card className="rounded-t-3xl border-0 bg-background/95 backdrop-blur-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Inviter en Live Duo</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un ami..."
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {friends?.map((friend) => (
                      <motion.div
                        key={friend.id}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>{friend.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{friend.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleInvite(friend.id)}
                          disabled={inviteToDuo.isPending}
                        >
                          Inviter
                        </Button>
                      </motion.div>
                    ))}
                    {friends?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucun ami trouvé
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
