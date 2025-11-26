import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Image, Video, Smile, X, Globe, Users, Lock, MapPin, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MediaUploader } from './MediaUploader';

type PostPrivacy = 'public' | 'friends' | 'private';

export const FacebookCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Veuillez ajouter du contenu ou un média');
      return;
    }

    if (!user) return;
    setIsSubmitting(true);
    setUploadProgress(5); // Démarrage

    try {
      // Étape 1: Création du post (10%)
      toast.loading('Création du post...', { id: 'post-creation' });
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          privacy: privacy
        })
        .select()
        .single();

      if (postError) throw postError;
      setUploadProgress(15);

      // Étape 2: Upload des médias si nécessaire
      if (mediaFiles.length > 0) {
        const totalFiles = mediaFiles.length;
        toast.loading(`Upload des fichiers (0/${totalFiles})...`, { id: 'post-creation' });
        
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;
          
          // Progression de 15% à 85% pour les uploads
          const progressStart = 15;
          const progressEnd = 85;
          const fileProgress = progressStart + ((i / totalFiles) * (progressEnd - progressStart));
          setUploadProgress(Math.round(fileProgress));
          
          toast.loading(`Upload des fichiers (${i + 1}/${totalFiles})...`, { id: 'post-creation' });
          
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(fileName);

          const mediaType = file.type.startsWith('video') ? 'video' : 'image';
          
          // Insérer dans post_media pour tous les médias
          await supabase.from('post_media').insert({
            post_id: post.id,
            media_url: publicUrl,
            media_type: mediaType,
            order_index: i,
            media_order: i
          });

          // Mise à jour du post avec le premier média (pour compatibilité)
          if (i === 0) {
            await supabase
              .from('posts')
              .update({
                media_url: publicUrl,
                media_type: mediaType
              })
              .eq('id', post.id);
          }

          // Ajout dans les albums photo si c'est une image
          if (mediaType === 'image') {
            try {
              await supabase.rpc('ensure_system_albums', { user_id_param: user.id });

              const { data: album } = await supabase
                .from('photo_albums')
                .select('id')
                .eq('user_id', user.id)
                .eq('system_album', 'post_photos')
                .single();

              if (album) {
                await supabase.from('photos').insert({
                  user_id: user.id,
                  album_id: album.id,
                  image_url: publicUrl,
                  caption: content.trim() || null,
                  privacy: privacy
                });
              }
            } catch (albumError) {
              console.error('Error adding to album:', albumError);
              // Non-bloquant, on continue
            }
          }
          
          // Progression finale de chaque fichier
          const fileFinalProgress = progressStart + (((i + 1) / totalFiles) * (progressEnd - progressStart));
          setUploadProgress(Math.round(fileFinalProgress));
        }
      }

      // Étape 3: Finalisation (90-100%)
      setUploadProgress(90);
      toast.loading('Finalisation...', { id: 'post-creation' });
      
      // Petit délai pour l'animation
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(100);
      
      toast.success('Post publié avec succès !', { id: 'post-creation' });
      
      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setPrivacy('public');
      
      // Petit délai avant de fermer
      await new Promise(resolve => setTimeout(resolve, 500));
      setDialogOpen(false);
      
      // Refresh feed immédiatement
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['smart-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['optimized-feed'] }), // Fixed key
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-posts'] })
      ]);
      
      // Force un refetch
      await queryClient.refetchQueries({ queryKey: ['optimized-feed'] });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la publication', { id: 'post-creation' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const privacyIcons = {
    public: <Globe className="h-4 w-4" />,
    friends: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  };

  return (
    <>
      {/* Create Post Card */}
      <Card className="mb-6 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex-1 text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors cursor-pointer"
            >
              Quoi de neuf, {profile?.name?.split(' ')[0]} ?
            </button>
          </div>
          
          <div className="flex items-center justify-around pt-3 border-t">
            <Button
              variant="ghost"
              className="flex-1 gap-2 hover:bg-muted"
              onClick={() => {
                setDialogOpen(true);
                // Use a small timeout to ensure the dialog is mounted before clicking the input
                // But since we use MediaUploader now, we might want to trigger its input
                setTimeout(() => {
                   const input = document.getElementById('media-input');
                   if (input) input.click();
                }, 100);
              }}
            >
              <Image className="h-5 w-5 text-green-500" />
              <span className="hidden sm:inline">Photo/vidéo</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 gap-2 hover:bg-muted"
              onClick={() => navigate('/live')}
            >
              <Zap className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline">Vidéo en direct</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Post Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une publication</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Info & Privacy */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">{profile?.name}</p>
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <div className="flex items-center gap-1">
                      {privacyIcons[privacy]}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>Amis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        <span>Privé</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Textarea */}
            <Textarea
              placeholder={`Quoi de neuf, ${profile?.name?.split(' ')[0]} ?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] border-0 focus-visible:ring-0 resize-none text-lg"
              disabled={isSubmitting}
            />

            {/* Media Uploader Component */}
            <MediaUploader 
              files={mediaFiles}
              setFiles={setMediaFiles}
              previews={mediaPreviews}
              setPreviews={setMediaPreviews}
              inputRef={fileInputRef}
            />

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary">
                    {uploadProgress < 15 ? 'Création du post...' :
                     uploadProgress < 85 ? 'Upload en cours...' :
                     uploadProgress < 100 ? 'Finalisation...' :
                     'Terminé !'}
                  </span>
                  <span className="text-primary font-bold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                {uploadProgress === 100 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-primary text-center font-medium"
                  >
                    ✓ Publication réussie !
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Add to Post Actions */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Ajouter à votre publication</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById('media-input')?.click()}
                  disabled={isSubmitting}
                  title="Photo/Vidéo"
                >
                  <Image className="h-5 w-5 text-green-500" />
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
              className="w-full"
            >
              {isSubmitting ? 'Publication en cours...' : 'Publier'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
