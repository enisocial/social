import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, User, FileText, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'group';
  title: string;
  subtitle?: string;
  avatar?: string;
  content?: string;
}

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const [usersData, postsData, groupsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, name, avatar_url, bio')
          .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .limit(5),
        
        supabase
          .from('posts')
          .select('id, content, created_at, profiles!user_id(username, name, avatar_url)')
          .ilike('content', `%${searchQuery}%`)
          .eq('privacy', 'public')
          .limit(5),
        
        supabase
          .from('groups')
          .select('id, name, description, avatar_url')
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .eq('privacy', 'public')
          .limit(5)
      ]);

      const searchResults: SearchResult[] = [
        ...(usersData.data?.map(user => ({
          id: user.id,
          type: 'user' as const,
          title: user.name,
          subtitle: `@${user.username}`,
          avatar: user.avatar_url || undefined,
          content: user.bio || undefined
        })) || []),
        ...(postsData.data?.map(post => ({
          id: post.id,
          type: 'post' as const,
          title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          subtitle: `Par ${post.profiles?.name || 'Utilisateur'}`,
          avatar: post.profiles?.avatar_url || undefined,
          content: post.content
        })) || []),
        ...(groupsData.data?.map(group => ({
          id: group.id,
          type: 'group' as const,
          title: group.name,
          subtitle: group.description || undefined,
          avatar: group.avatar_url || undefined
        })) || [])
      ];

      setResults(searchResults);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        supabase
          .from('profiles')
          .select('username')
          .eq('id', result.id)
          .single()
          .then(({ data }) => {
            if (data) navigate(`/profile/${data.username}`);
          });
        break;
      case 'post':
        navigate(`/post/${result.id}`);
        break;
      case 'group':
        navigate(`/group/${result.id}`);
        break;
    }
    setQuery('');
    setResults([]);
  };

  const userResults = results.filter(r => r.type === 'user');
  const postResults = results.filter(r => r.type === 'post');
  const groupResults = results.filter(r => r.type === 'group');

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher des utilisateurs, posts, groupes..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm border-white/20 dark:border-gray-700/50"
        />
      </div>

      {query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Recherche en cours...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucun résultat trouvé
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">Tous ({results.length})</TabsTrigger>
                <TabsTrigger value="users">
                  <User className="h-4 w-4 mr-1" />
                  {userResults.length}
                </TabsTrigger>
                <TabsTrigger value="posts">
                  <FileText className="h-4 w-4 mr-1" />
                  {postResults.length}
                </TabsTrigger>
                <TabsTrigger value="groups">
                  <Users className="h-4 w-4 mr-1" />
                  {groupResults.length}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-1 mt-2">
                {results.map((result) => (
                  <ResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="users" className="space-y-1 mt-2">
                {userResults.map((result) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="posts" className="space-y-1 mt-2">
                {postResults.map((result) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="groups" className="space-y-1 mt-2">
                {groupResults.map((result) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
};

interface ResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

const ResultItem = ({ result, onClick }: ResultItemProps) => {
  const getIcon = () => {
    switch (result.type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'post':
        return <FileText className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-3 hover:bg-accent transition-colors text-left flex items-center gap-3"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={result.avatar} />
        <AvatarFallback>
          {getIcon()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {result.type === 'user' && 'Utilisateur'}
        {result.type === 'post' && 'Post'}
        {result.type === 'group' && 'Groupe'}
      </div>
    </button>
  );
};
