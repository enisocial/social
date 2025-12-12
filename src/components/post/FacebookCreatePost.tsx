import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Image, Video, Smile, Globe, Users, Lock, MapPin, Plus, Camera, Heart, Angry, Laugh, Frown, ThumbsUp, Coffee, Music, Gamepad2, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MediaUploader } from './MediaUploader';

type PostPrivacy = 'public' | 'friends' | 'private';

export const FacebookCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [moodDialogOpen, setMoodDialogOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
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
    setUploadProgress(5);

    try {
      // Création du post
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

      // Upload des médias si nécessaire
      if (mediaFiles.length > 0) {
        const totalFiles = mediaFiles.length;
        toast.loading(`Upload des fichiers (0/${totalFiles})...`, { id: 'post-creation' });

        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

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

          // Insérer dans post_media
          await supabase.from('post_media').insert({
            post_id: post.id,
            media_url: publicUrl,
            media_type: mediaType,
            order_index: i,
            media_order: i
          });

          // Mise à jour du post avec le premier média
          if (i === 0) {
            await supabase
              .from('posts')
              .update({
                media_url: publicUrl,
                media_type: mediaType
              })
              .eq('id', post.id);
          }

          const fileFinalProgress = progressStart + (((i + 1) / totalFiles) * (progressEnd - progressStart));
          setUploadProgress(Math.round(fileFinalProgress));
        }
      }

      setUploadProgress(90);
      toast.loading('Finalisation...', { id: 'post-creation' });

      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(100);

      toast.success('Post publié avec succès !', { id: 'post-creation' });

      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setPrivacy('public');

      await new Promise(resolve => setTimeout(resolve, 500));
      setDialogOpen(false);

      // Refresh feed
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['smart-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['optimized-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-posts'] })
      ]);

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
      {/* Simple Create Post Box */}
      <Card className="p-4 bg-white dark:bg-gray-800 border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {profile?.name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex-1 text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full px-4 py-2.5 text-gray-500 dark:text-gray-300 transition-colors"
          >
            Quoi de neuf, {profile?.name?.split(' ')[0]} ?
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <button
            onClick={() => setLiveDialogOpen(true)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Video className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium">Vidéo en direct</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Image className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Photo/vidéo</span>
          </button>

          <button
            onClick={() => setMoodDialogOpen(true)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Smile className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Humeur</span>
          </button>
        </div>

        {/* Hidden file input for photo/video button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              // Trigger the create post dialog and add files
              setDialogOpen(true);
              // Add files to state (this will be handled by MediaUploader)
              const newPreviews = files.map(file => URL.createObjectURL(file));
              setMediaFiles(prev => [...prev, ...files]);
              setMediaPreviews(prev => [...prev, ...newPreviews]);
            }
            // Reset input
            if (e.target) e.target.value = '';
          }}
        />
      </Card>

      {/* Live Streaming Dialog */}
      <Dialog open={liveDialogOpen} onOpenChange={setLiveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-6 w-6 text-red-500" />
              Vidéo en direct
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fonctionnalité en développement</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                La diffusion en direct sera bientôt disponible. Restez connecté !
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  🚀 Cette fonctionnalité arrive prochainement avec streaming haute qualité et chat en direct.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLiveDialogOpen(false)}>
                Plus tard
              </Button>
              <Button
                onClick={() => {
                  setLiveDialogOpen(false);
                  toast.info('Merci pour votre intérêt ! Nous travaillons dessus.');
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Me notifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mood Selection Dialog */}
      <Dialog open={moodDialogOpen} onOpenChange={setMoodDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smile className="h-6 w-6 text-yellow-500" />
              Comment vous sentez-vous ?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Heart, label: 'Aimé', color: 'text-red-500' },
                { icon: Laugh, label: 'Heureux', color: 'text-yellow-500' },
                { icon: ThumbsUp, label: 'Génial', color: 'text-blue-500' },
                { icon: Coffee, label: 'Fatigué', color: 'text-orange-500' },
                { icon: Frown, label: 'Triste', color: 'text-gray-500' },
                { icon: Angry, label: 'En colère', color: 'text-red-600' },
                { icon: Music, label: 'Musical', color: 'text-purple-500' },
                { icon: Gamepad2, label: 'En train de jouer', color: 'text-green-500' },
                { icon: MapPin, label: 'En voyage', color: 'text-blue-400' }
              ].map((mood) => {
                const Icon = mood.icon;
                return (
                  <button
                    key={mood.label}
                    onClick={() => {
                      setSelectedMood(mood.label);
                      setMoodDialogOpen(false);
                      setDialogOpen(true);
                      setContent(`Se sent ${mood.label.toLowerCase()} `);
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon className={`h-8 w-8 ${mood.color}`} />
                    <span className="text-sm text-center">{mood.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setMoodDialogOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Post Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Créer une publication</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Info & Privacy */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  {profile?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="font-semibold">{profile?.name}</p>
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                  <SelectTrigger className="w-[140px] h-8">
                    <div className="flex items-center gap-2">
                      {privacyIcons[privacy]}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Amis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>Privé</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Textarea with integrated controls */}
            <div className="relative">
              <Textarea
                placeholder={`Quoi de neuf, ${profile?.name?.split(' ')[0]} ?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] border-0 focus:ring-0 resize-none text-lg pr-12"
                disabled={isSubmitting}
              />

              {/* Integrated media and mood buttons inside textarea */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Ajouter une photo ou une vidéo"
                >
                  <Image className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setMoodDialogOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Ajouter une humeur"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Media Uploader - shown when files are added */}
            {mediaPreviews.length > 0 && (
              <MediaUploader
                files={mediaFiles}
                setFiles={setMediaFiles}
                previews={mediaPreviews}
                setPreviews={setMediaPreviews}
                inputRef={fileInputRef}
              />
            )}

            {/* Mood indicator - Facebook style sticker */}
            {selectedMood && (
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1">
                    {selectedMood === 'Aimé' && <Heart className="h-4 w-4 text-red-500" />}
                    {selectedMood === 'Heureux' && <Laugh className="h-4 w-4 text-yellow-500" />}
                    {selectedMood === 'Génial' && <ThumbsUp className="h-4 w-4 text-blue-500" />}
                    {selectedMood === 'Fatigué' && <Coffee className="h-4 w-4 text-orange-500" />}
                    {selectedMood === 'Triste' && <Frown className="h-4 w-4 text-gray-500" />}
                    {selectedMood === 'En colère' && <Angry className="h-4 w-4 text-red-600" />}
                    {selectedMood === 'Musical' && <Music className="h-4 w-4 text-purple-500" />}
                    {selectedMood === 'En train de jouer' && <Gamepad2 className="h-4 w-4 text-green-500" />}
                    {selectedMood === 'En voyage' && <MapPin className="h-4 w-4 text-blue-400" />}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Se sent {selectedMood.toLowerCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMood('');
                      setContent(content.replace(`Se sent ${selectedMood.toLowerCase()} `, ''));
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-center text-gray-600">
                  {uploadProgress < 15 ? 'Initialisation...' :
                   uploadProgress < 85 ? 'Téléchargement...' :
                   uploadProgress < 100 ? 'Finalisation...' :
                   'Publication réussie !'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Publication...' : 'Publier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
