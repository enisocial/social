import { useState, useMemo, useCallback } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessenger } from '@/contexts/MessengerContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const Messages = () => {
  const { conversations, loading, createConversation } = useConversations();
  const { openBubble } = useMessenger();

  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  /** ---------------------------
   * 🔍 Recherche utilisateur
   ------------------------------ */
  const handleSearchUsers = useCallback(async () => {
    if (!userSearch.trim()) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url')
      .or(`username.ilike.%${userSearch}%,name.ilike.%${userSearch}%`)
      .limit(10);

    setSearchResults(data || []);
  }, [userSearch]);

  /** ---------------------------
   * ➕ Démarrer une conversation
   ------------------------------ */
  const handleStartConversation = useCallback(
    async (userId: string, user: any) => {
      const conversationId = await createConversation(userId);
      if (!conversationId) return;

      setNewChatOpen(false);

      openBubble(conversationId, {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar_url: user.avatar_url,
      });
    },
    [createConversation, openBubble]
  );

  /** ---------------------------
   * 🧩 Filtrer les conversations
   ------------------------------ */
  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();

    if (!query) return conversations || [];

    return (conversations || []).filter((conv) => {
      const name = conv.otherUser?.name?.toLowerCase() || '';
      const username = conv.otherUser?.username?.toLowerCase() || '';
      return name.includes(query) || username.includes(query);
    });
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-4xl mx-auto px-4 py-8">

        {/* HEADER */}
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
                          <AvatarFallback>
                            {user.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user?.name}</p>
                          <p className="text-sm text-muted-foreground">@{user?.username}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-20 bg-muted rounded-xl"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          /** EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <p className="text-foreground font-medium">
              {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
            </p>
            <p className="text-sm text-muted-foreground">
              Commencez une nouvelle conversation pour discuter
            </p>
          </div>
        ) : (
          /** LISTE DES CONVERSATIONS */
          <div className="space-y-2">
            {filteredConversations.map((conv) => {
              const other = conv.otherUser || { id: "", name: "", username: "", avatar_url: null };
              return (
                <div
                  key={conv.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 rounded-xl bg-card border border-border"
                  onClick={() => {
                    console.log('👆 Clic sur conversation depuis Messages:', other.name, 'ID:', conv.id);
                    // UTILISER LE VRAI ID DE CONVERSATION
                    openBubble(conv.id, {
                      id: other.id,
                      name: other.name,
                      username: other.username,
                      avatar_url: other.avatar_url,
                    });
                  }}
                >
                  <div className="flex items-center gap-3">

                    {/* AVATAR */}
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-primary/20">
                        <AvatarImage src={other?.avatar_url || ''} />
                        <AvatarFallback>
                          {other?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>

                      {conv.unreadCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* TEXT */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">
                          {other?.name || "Utilisateur supprimé"}
                        </h3>

                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-sm truncate text-muted-foreground">
                        {conv.lastMessage?.content || "Commencez une conversation"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
