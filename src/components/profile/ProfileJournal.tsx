import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle, Share2, MapPin, Users, Image, Video, UserPlus, Edit, Calendar, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';

interface ProfileJournalProps {
  userId: string;
  onPostDelete: () => void;
}

interface JournalEntry {
  id: string;
  type: 'post' | 'album_created' | 'friend_added' | 'profile_updated' | 'life_event';
  date: Date;
  content: any;
  metadata?: any;
}

export const ProfileJournal = ({ userId, onPostDelete }: ProfileJournalProps) => {
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['profile-journal', userId],
    queryFn: async () => {
      // Récupérer les posts avec médias et interactions
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(username, name, avatar_url),
          post_media(id, media_url, media_type, order_index),
          post_tags(tagged_user:profiles!post_tags_tagged_user_id_fkey(id, name, username))
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Récupérer les albums créés
      const { data: albums } = await supabase
        .from('photo_albums')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Transformer en entrées de journal chronologiques
      const entries: JournalEntry[] = [];

      // Ajouter les posts
      posts?.forEach(post => {
        entries.push({
          id: `post-${post.id}`,
          type: 'post',
          date: new Date(post.created_at),
          content: post
        });
      });

      // Ajouter les albums
      albums?.forEach(album => {
        entries.push({
          id: `album-${album.id}`,
          type: 'album_created',
          date: new Date(album.created_at),
          content: album
        });
      });

      // Trier par date décroissante
      return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
  });

  const renderJournalEntry = (entry: JournalEntry) => {
    switch (entry.type) {
      case 'post':
        return (
          <div key={entry.id} className="mb-6">
            <EnhancedPostCard
              post={entry.content}
              onDelete={onPostDelete}
            />
          </div>
        );

      case 'album_created':
        const album = entry.content;
        return (
          <Card key={entry.id} className="p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(entry.date, { addSuffix: true, locale: fr })}</span>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">
                    A créé un album : <Link to={`/albums/${album.id}`} className="text-primary hover:underline">{album.name}</Link>
                  </p>
                  {album.description && (
                    <p className="text-muted-foreground text-sm">{album.description}</p>
                  )}
                  {album.cover_photo_url && (
                    <div className="mt-3">
                      <img
                        src={album.cover_photo_url}
                        alt={album.name}
                        className="rounded-lg max-w-md max-h-64 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!journalEntries || journalEntries.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Aucune activité</h3>
          <p>Le journal de ce profil est vide pour le moment.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {journalEntries.map(renderJournalEntry)}
    </div>
  );
};
