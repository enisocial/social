import { useAuth } from '@/hooks/useAuth';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { SmartFriendSuggestionCard } from '@/components/friends/SmartFriendSuggestionCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FriendSuggestionsWidget() {
  const { user } = useAuth();
  const { suggestions, loading, hideSuggestion } = useSmartFriendSuggestions(user?.id, 5);

  if (!user) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Suggestions d'amis
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/friend-suggestions" className="gap-1">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune suggestion pour le moment
        </p>
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
    </Card>
  );
}
