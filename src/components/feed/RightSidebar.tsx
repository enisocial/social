import { useAuth } from '@/hooks/useAuth';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { SmartFriendSuggestionCard } from '@/components/friends/SmartFriendSuggestionCard';
import { OnlineFriendsList } from '@/components/OnlineFriendsList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Hash, ArrowRight, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RightSidebar = () => {
  const { user } = useAuth();
  const { suggestions, loading, hideSuggestion } = useSmartFriendSuggestions(user?.id, 4);

  return (
    <aside className="hidden xl:block w-80 fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-4">
      {/* Online Friends */}
      {user && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Circle className="w-3 h-3 text-green-500 fill-green-500" />
              Amis connectés
            </h3>
          </div>
          <OnlineFriendsList userId={user.id} />
        </Card>
      )}

      {/* Smart Friend Suggestions */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Suggestions d'amis
          </h3>
          <Link to="/friend-suggestions">
            <Button variant="ghost" size="sm" className="gap-1">
              Voir tout
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <SmartFriendSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onHide={hideSuggestion}
                variant="compact"
              />
            ))}
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune suggestion pour le moment
          </p>
        )}
      </Card>

      {/* Trending Topics */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Tendances
        </h3>
        <div className="space-y-3">
          {[
            { tag: '#Technologie', posts: '2.5k posts' },
            { tag: '#Voyages', posts: '1.8k posts' },
            { tag: '#Cuisine', posts: '1.2k posts' },
            { tag: '#Sport', posts: '980 posts' },
            { tag: '#Mode', posts: '750 posts' },
          ].map((trend) => (
            <div
              key={trend.tag}
              className="hover:bg-accent/50 p-2 rounded-lg cursor-pointer transition-colors"
            >
              <p className="font-medium text-sm">{trend.tag}</p>
              <p className="text-xs text-muted-foreground">{trend.posts}</p>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
};
