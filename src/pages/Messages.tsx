import { useState, useMemo, useCallback } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessenger } from '@/contexts/MessengerContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Messages = () => {
  const { conversations, loading, createConversation } = useConversations();
  const { openBubble } = useMessenger();
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // OPTIMIZED: Memoized callbacks to prevent recreating functions
  const handleSearchUsers = useCallback(async () => {
    if (!userSearch.trim()) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url')
      .or(`username.ilike.%${userSearch}%,name.ilike.%${userSearch}%`)
      .limit(10);

    setSearchResults(data || []);
  }, [userSearch]);

  const handleStartConversation = useCallback(async (userId: string, user: any) => {
    const conversationId = await createConversation(userId);
    if (conversationId) {
      setNewChatOpen(false);
      openBubble(conversationId, {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar_url: user.avatar_url
      });
    }
  }, [createConversation, openBubble]);

  // OPTIMIZED: Memoized filter to prevent recalculation on every render
  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return conversations;
    
    return conversations.filter(conv =>
      conv.otherUser?.name.toLowerCase().includes(query) ||
      conv.otherUser?.username.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  />
                  <Button onClick={handleSearchUsers}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map((user) => (
                    <Card
                      key={user.id}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleStartConversation(user.id, user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="border-2 border-primary/20">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-2">
              {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Commencez une nouvelle conversation pour rester en contact
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-all rounded-xl bg-card border border-border hover:shadow-sm"
                onClick={() => {
                  // openBubble gère automatiquement le reset du compteur
                  openBubble(conv.id, {
                    id: conv.otherUser?.id || '',
                    name: conv.otherUser?.name || '',
                    username: conv.otherUser?.username || '',
                    avatar_url: conv.otherUser?.avatar_url || null
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={conv.otherUser?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {conv.otherUser?.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount! > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                        <span className="text-xs font-bold text-primary-foreground">
                          {conv.unreadCount! > 9 ? '9+' : conv.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold truncate ${conv.unreadCount! > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                        {conv.otherUser?.name}
                      </h3>
                      {conv.lastMessage && (
                        <span className={`text-xs shrink-0 ml-2 ${conv.unreadCount! > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                            addSuffix: false,
                            locale: fr
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate flex-1 ${conv.unreadCount! > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage?.content || 'Commencez une conversation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
