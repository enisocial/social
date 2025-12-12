import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSmartFriendSuggestions } from '@/hooks/useSmartFriendSuggestions';
import { SmartFriendSuggestionCard } from '@/components/friends/SmartFriendSuggestionCard';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function FriendSuggestions() {
  const { user } = useAuth();
  const { suggestions, loading, refetch, hideSuggestion } = useSmartFriendSuggestions(user?.id, 50);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* HEADER MODERNE */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="bg-white/60 hover:bg-white/80">
                <Link to="/friends">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-3 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  Suggestions d'amis
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Personnes que vous pourriez connaître
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2 bg-white/60 hover:bg-white/80"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Suggestions grid */}
        {!loading && suggestions.length > 0 && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {suggestions.map((suggestion) => (
              <SmartFriendSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onHide={hideSuggestion}
                variant="full"
              />
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && suggestions.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune suggestion pour le moment</h3>
            <p className="text-muted-foreground mb-4">
              Revenez plus tard pour découvrir de nouvelles personnes
            </p>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
