import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface FriendsSectionProps {
  userId: string;
}

export const FriendsSection = ({ userId }: FriendsSectionProps) => {
  const [search, setSearch] = useState('');

  const { data: friends, isLoading } = useQuery({
    queryKey: ['profile-friends', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) throw error;

      return data.map(req => {
        const friend = req.sender_id === userId ? req.receiver : req.sender;
        return friend;
      });
    }
  });

  const filteredFriends = friends?.filter(friend =>
    friend.name.toLowerCase().includes(search.toLowerCase()) ||
    friend.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square bg-muted animate-pulse" />
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Amis · {friends?.length || 0}
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des amis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredFriends.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            {search ? 'Aucun ami trouvé' : 'Aucun ami'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFriends.map((friend) => (
            <Link key={friend.id} to={`/profile/${friend.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <Avatar className="h-full w-full rounded-none">
                    <AvatarImage src={friend.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="rounded-none text-4xl">
                      {friend.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardContent className="p-3">
                  <div className="font-semibold truncate">{friend.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    @{friend.username}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};