import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Image, Video, Smile, X, Globe, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type PostPrivacy = 'public' | 'friends' | 'private';

export const ModernCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PostPrivacy>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté');
      return;
    }

    const maxSize = file.type.startsWith('video') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeText = file.type.startsWith('video') ? '100MB' : '10MB';
      toast.error(`Le fichier est trop volumineux (max ${maxSizeText})`);
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !mediaFile) {
      toast.error('Veuillez ajouter du contenu ou une image');
      return;
    }

    if (!user) return;
    setIsSubmitting(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        setUploadProgress(30);
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('video') ? 'video' : 'image';
        setUploadProgress(70);
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        privacy
      });

      if (error) throw error;

      setUploadProgress(100);
      toast.success('Post publié avec succès');
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setPrivacy('public');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la création du post');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const privacyIcon = {
    public: <Globe className="h-4 w-4" />,
    friends: <Users className="h-4 w-4" />,
    private: <Lock className="h-4 w-4" />
  };

  return (
    <>
      <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex-1 text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors"
            >
              Quoi de neuf, {profile?.name?.split(' ')[0]} ?
            </button>
          </div>
          
          <div className="flex items-center justify-around mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(true)}
              className="flex-1 hover:bg-muted"
            >
              <Image className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-muted-foreground">Photo</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(true)}
              className="flex-1 hover:bg-muted"
            >
              <Video className="h-5 w-5 mr-2 text-red-500" />
              <span className="text-muted-foreground">Vidéo</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(true)}
              className="flex-1 hover:bg-muted"
            >
              <Smile className="h-5 w-5 mr-2 text-yellow-500" />
              <span className="text-muted-foreground">Humeur</span>
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Créer une publication</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{profile?.name}</p>
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        {privacyIcon.public}
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        {privacyIcon.friends}
                        <span>Amis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        {privacyIcon.private}
                        <span>Privé</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              placeholder="Quoi de neuf ?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] border-0 focus-visible:ring-0 resize-none text-lg"
              disabled={isSubmitting}
            />

            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden border">
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-card rounded-full hover:bg-muted z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                {mediaFile?.type.startsWith('video') ? (
                  <video src={mediaPreview} controls className="w-full" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full" />
                )}
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="h-1" />
            )}

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Ajouter à votre publication</span>
              <div className="flex gap-2">
                <label className="cursor-pointer p-2 hover:bg-muted rounded-full transition-colors">
                  <Image className="h-5 w-5 text-green-500" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !mediaFile)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Publication...' : 'Publier'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
