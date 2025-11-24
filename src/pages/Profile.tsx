import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { useChatActions } from '@/hooks/useChatActions';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, UserMinus, Settings, Grid, ArrowLeft, Home, BarChart3, Images, MessageCircle } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { AvatarEditor } from '@/components/AvatarEditor';
import { CoverPhotoEditor } from '@/components/CoverPhotoEditor';
import { ProfileInfo } from '@/components/ProfileInfo';
import { FriendButton } from '@/components/FriendButton';
import { ProfileStatsWidget } from '@/components/ProfileStatsWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { usePhotoAlbums } from '@/hooks/usePhotoAlbums';
import { Card as CardComponent, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { useSharedPosts } from '@/hooks/useSharedPosts';
import { SharedPostCard } from '@/components/SharedPostCard';
import { PhotoViewer } from '@/components/PhotoViewer';

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    name: string;
    avatar_url: string | null;
  };
  likes: Array<{ user_id: string }>;
  comments: Array<{ id: string }>;
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChatWithUser } = useChatActions();
  const [userId, setUserId] = useState<string>('');
  const { profile, stats, isFollowing, loading, toggleFollow, updateProfile } = useProfile(userId);
  const { settings } = useAccountSettings(userId);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const { albums, createAlbum } = usePhotoAlbums(userId);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const { sharedPosts } = useSharedPosts(userId);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

  useEffect(() => {
    if (username) {
      fetchUserByUsername();
    }
  }, [username]);

  useEffect(() => {
    if (userId) {
      fetchUserPosts();
    }
  }, [userId]);

  const fetchUserByUsername = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (error || !data) {
      toast.error('Utilisateur introuvable');
      navigate('/');
      return;
    }

    setUserId(data.id);
  };

  const fetchUserPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, name, avatar_url),
        likes (user_id),
        comments (id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des posts');
      return;
    }

    setPosts(data as Post[]);
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      name: editedName,
      bio: editedBio
    });
    setEditMode(false);
  };

  const handleCreateAlbum = async () => {
    if (!albumName.trim()) return;

    await createAlbum.mutateAsync({
      name: albumName,
      description: albumDescription,
    });

    setAlbumName('');
    setAlbumDescription('');
    setAlbumDialogOpen(false);
  };

  if (loading || !profile) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex gap-2">
        <Button variant="ghost" onClick={() => navigate('/feed')} className="gap-2">
          <Home className="h-4 w-4" />
          Accueil
        </Button>
      </div>
      
      <Card className="p-0 mb-6 bg-card border-border overflow-hidden">
        {isOwnProfile ? (
          <CoverPhotoEditor
            currentCover={profile.cover_photo_url}
            userId={userId}
            onCoverUpdate={() => window.location.reload()}
          />
        ) : profile.cover_photo_url ? (
          <div className="relative h-48 overflow-hidden">
            <img
              src={profile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isOwnProfile ? (
            <AvatarEditor
              currentAvatar={profile.avatar_url}
              userName={profile.name}
              userId={userId}
              onAvatarUpdate={() => {
                window.location.reload();
              }}
            />
          ) : (
            <div 
              className="cursor-pointer" 
              onClick={() => setPhotoViewerOpen(true)}
            >
              <Avatar className="w-24 h-24 border-4 border-primary/20 hover:border-primary/40 transition-all">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              {isOwnProfile ? (
                <Dialog open={editMode} onOpenChange={setEditMode}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditedName(profile.name);
                      setEditedBio(profile.bio || '');
                    }}>
                      <Settings className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier le profil</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nom</Label>
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Bio</Label>
                        <Textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleSaveProfile} className="w-full">
                        Enregistrer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <FriendButton
                  targetUserId={userId}
                  targetUsername={profile.username}
                  targetName={profile.name}
                  targetAvatarUrl={profile.avatar_url}
                />
              )}
            </div>

            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold text-foreground">{stats.postsCount}</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
              <div>
                <span className="font-bold text-foreground">{stats.followersCount}</span>
                <span className="text-muted-foreground ml-1">abonnés</span>
              </div>
              <div>
                <span className="font-bold text-foreground">{stats.followingCount}</span>
                <span className="text-muted-foreground ml-1">abonnements</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </Card>

      {isOwnProfile && <ProfileStatsWidget userId={userId} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Sidebar - À propos et Informations */}
        <div className="lg:col-span-1">
          {profile && (
            <ProfileInfo
              profile={profile}
              settings={settings || undefined}
              isOwnProfile={isOwnProfile}
            />
          )}
        </div>

        {/* Right Content - Publications et Albums */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts" className="gap-2">
            <Grid className="h-4 w-4" />
            Publications
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-2">
            <Images className="h-4 w-4" />
            Albums
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6 space-y-4">
          {posts.length === 0 && sharedPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <Grid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune publication</h3>
              <p className="text-muted-foreground">
                {isOwnProfile 
                  ? "Vous n'avez pas encore publié de contenu" 
                  : "Cet utilisateur n'a pas encore de publications"}
              </p>
            </Card>
          ) : (
            <>
              {/* Merge posts and shared posts, sort by date */}
              {[
                ...posts.map((post) => ({
                  type: 'post' as const,
                  date: new Date(post.created_at),
                  content: <PostCard key={`post-${post.id}`} post={post} onDelete={fetchUserPosts} />
                })),
                ...sharedPosts.map((share: any) => ({
                  type: 'share' as const,
                  date: new Date(share.created_at),
                  content: <SharedPostCard key={`share-${share.id}`} share={share} />
                }))
              ]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((item) => item.content)
              }
            </>
          )}
        </TabsContent>

        <TabsContent value="albums" className="mt-6">
          {isOwnProfile && (
            <div className="mb-4 flex justify-end">
              <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un album
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un album</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="album-name">Nom de l'album</Label>
                      <Input
                        id="album-name"
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        placeholder="Vacances 2024..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="album-desc">Description</Label>
                      <Textarea
                        id="album-desc"
                        value={albumDescription}
                        onChange={(e) => setAlbumDescription(e.target.value)}
                        placeholder="Décrivez votre album..."
                      />
                    </div>
                    <Button onClick={handleCreateAlbum} className="w-full">
                      Créer l'album
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums
              ?.sort((a, b) => {
                // System albums first (in specific order)
                const systemOrder = ['profile_pictures', 'cover_photos', 'post_photos'];
                const aIndex = a.system_album ? systemOrder.indexOf(a.system_album) : 999;
                const bIndex = b.system_album ? systemOrder.indexOf(b.system_album) : 999;
                
                if (aIndex !== bIndex) return aIndex - bIndex;
                
                // Then sort by creation date for personal albums
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              })
              ?.map((album) => (
              <CardComponent 
                key={album.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/albums/${album.id}`)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted">
                    {album.cover_photo_url ? (
                      <img 
                        src={album.cover_photo_url} 
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {album.system_album && (
                      <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-md text-xs font-medium">
                        Album système
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold truncate">{album.name}</h3>
                    {album.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {album.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </CardComponent>
            ))}
          </div>

          {albums?.length === 0 && (
            <Card className="p-12 text-center">
              <Images className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun album</h3>
              <p className="text-muted-foreground">
                {isOwnProfile 
                  ? "Vous n'avez pas encore créé d'album" 
                  : "Cet utilisateur n'a pas encore d'albums"}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          {isOwnProfile ? (
            <ProfileStatsWidget userId={userId} />
          ) : (
            <Card className="p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Statistiques privées</h3>
              <p className="text-muted-foreground">
                Les statistiques ne sont visibles que par le propriétaire du profil
              </p>
            </Card>
          )}
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Photo Viewer */}
      <PhotoViewer
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        photoUrl={profile?.avatar_url || ''}
        coverPhotoUrl={profile?.cover_photo_url}
        userName={profile?.name}
      />
    </div>
  );
}
