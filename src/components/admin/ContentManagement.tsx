import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, ImageIcon, Video, AlertTriangle, Eye, Trash2,
  Search, Filter, RefreshCw, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
  post_media: Array<{
    media_url: string;
    media_type: string;
  }>;
  _count?: {
    post_likes: number;
    comments: number;
  };
}

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    username: string;
  };
}

export const ContentManagement = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    } else if (activeTab === 'media') {
      fetchMedia();
    }
  }, [activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            name,
            username,
            avatar_url
          ),
          post_media (
            media_url,
            media_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erreur chargement posts:', error);
      toast.error('Erreur lors du chargement des publications');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    setLoading(true);
    try {
      // Récupérer les médias via les posts pour avoir les infos utilisateur
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          profiles:user_id (
            name,
            username
          ),
          post_media (
            id,
            media_url,
            media_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Aplatir les données pour avoir une liste de médias avec infos utilisateur
      const mediaItems: MediaItem[] = [];
      data?.forEach(post => {
        post.post_media?.forEach(media => {
          mediaItems.push({
            id: media.id,
            media_url: media.media_url,
            media_type: media.media_type,
            created_at: media.created_at,
            user_id: post.id, // On utilise l'ID du post comme référence
            profiles: post.profiles
          });
        });
      });

      setMedia(mediaItems.slice(0, 100)); // Limiter à 100 éléments
    } catch (error) {
      console.error('Erreur chargement média:', error);
      toast.error('Erreur lors du chargement des médias');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Publication supprimée');
    } catch (error) {
      console.error('Erreur suppression post:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) return;

    try {
      const { error } = await supabase
        .from('post_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setMedia(media.filter(m => m.id !== mediaId));
      toast.success('Média supprimé');
    } catch (error) {
      console.error('Erreur suppression média:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMedia = media.filter(item =>
    item.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestion du contenu</h2>
        <Button onClick={() => activeTab === 'posts' ? fetchPosts() : fetchMedia()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="posts">
            <FileText className="w-4 h-4 mr-2" />
            Publications ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon className="w-4 h-4 mr-2" />
            Médias ({media.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.profiles?.avatar_url || '/placeholder.svg'}
                      alt={post.profiles?.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{post.profiles?.name}</p>
                      <p className="text-sm text-muted-foreground">@{post.profiles?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(post.created_at).toLocaleDateString('fr-FR')}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm mb-4">{post.content}</p>

                {/* Media Preview */}
                {post.post_media && post.post_media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {post.post_media.slice(0, 3).map((media, index) => (
                      <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                        {media.media_type.startsWith('image/') ? (
                          <img
                            src={media.media_url}
                            alt="Media"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={media.media_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}
                      </div>
                    ))}
                    {post.post_media.length > 3 && (
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium">+{post.post_media.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>👍 {post._count?.post_likes || 0} likes</span>
                  <span>💬 {post._count?.comments || 0} commentaires</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPosts.length === 0 && !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune publication</h3>
                <p className="text-muted-foreground">Aucune publication trouvée.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground">@{item.profiles?.username}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMedia(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-2">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                    {item.media_type.startsWith('image/') ? (
                      <img
                        src={item.media_url}
                        alt="Media"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {item.media_type.startsWith('image/') ? 'Image' : 'Vidéo'}
                    </Badge>
                    <span>{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMedia.length === 0 && !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun média</h3>
                <p className="text-muted-foreground">Aucun média trouvé.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
