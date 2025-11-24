import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface FriendTaggerProps {
  selectedFriends: string[];
  onSelectFriends: (friends: string[]) => void;
}

export const FriendTagger = ({ selectedFriends, onSelectFriends }: FriendTaggerProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: friends } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) throw error;

      return data.map(req => {
        const friend = req.sender_id === user.id ? req.receiver : req.sender;
        return friend;
      });
    },
    enabled: !!user && open
  });

  const filteredFriends = friends?.filter(friend =>
    friend.name.toLowerCase().includes(search.toLowerCase()) ||
    friend.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const toggleFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      onSelectFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      onSelectFriends([...selectedFriends, friendId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4 text-blue-500" />
          Identifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Identifier des amis</DialogTitle>
        </DialogHeader>
        
        <Input
          placeholder="Rechercher des amis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
              onClick={() => toggleFriend(friend.id)}
            >
              <Checkbox checked={selectedFriends.includes(friend.id)} />
              <Avatar className="h-10 w-10">
                <AvatarImage src={friend.avatar_url || ''} />
                <AvatarFallback>{friend.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{friend.name}</div>
                <div className="text-sm text-muted-foreground">@{friend.username}</div>
              </div>
            </div>
          ))}

          {filteredFriends.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Aucun ami trouvé
            </div>
          )}
        </div>

        <Button onClick={() => setOpen(false)} className="w-full mt-4">
          Terminé
        </Button>
      </DialogContent>
    </Dialog>
  );
};