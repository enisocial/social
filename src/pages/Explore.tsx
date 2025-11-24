import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { PostCard } from '@/components/PostCard';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Loader2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Explore = () => {
  const navigate = useNavigate();
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            name,
            avatar_url
          ),
          likes (user_id),
          comments (id)
        `)
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/feed')} className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-6">Explorer</h1>
        
        <div className="mb-6">
          <GlobalSearch />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-6 animate-fade-in">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post as any}
                onDelete={() => refetch()}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun post disponible</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
