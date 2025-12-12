import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Image, Video, MapPin, Smile, X, Globe, Users, Lock, 
  UserPlus, Link as LinkIcon, Calendar, Palette 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LinkPreview } from './LinkPreview';
import { FriendTagger } from './FriendTagger';
import { BackgroundSelector } from './BackgroundSelector';
import { MediaUploader } from './MediaUploader';
import { FeelingSelector } from './FeelingSelector';
import { LocationInput } from './LocationInput';

type PostPrivacy = 'public' | 'friends' | 'private';

const PRIVACY_ICONS = {
  public: Globe,
  friends: Users,
  private: Lock
};

const PRIVACY_LABELS = {
  public: 'Public',
  friends: 'Amis',
  private: 'Privé'
};

export const FacebookStyleCreatePost = () => {
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
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [taggedFriends, setTaggedFriends] = useState<string[]>([]);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [detectedLink, setDetectedLink] = useState('');
  const [linkPreview, setLinkPreview] = useState<any>(null);
  const [scheduledFor, setScheduledFor] = useState('');

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

  // Auto-save draft
  useEffect(() => {
    if (!user || !dialogOpen) return;
    
    const saveDraft = async () => {
      if (content || mediaFiles.length > 0) {
        await supabase.from('post_drafts').upsert({
          user_id: user.id,
          content,
          privacy,
          background_color: backgroundColor,
          feeling,
          location,
          tagged_users: taggedFriends
        });
      }
    };

    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [content, mediaFiles, privacy, backgroundColor, feeling, location, taggedFriends, user, dialogOpen]);

  // Load draft
  useEffect(() => {
    if (!user || !dialogOpen) return;

    const loadDraft = async () => {
      const { data } = await supabase
        .from('post_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setContent(data.content || '');
        setPrivacy((data.privacy as PostPrivacy) || 'public');
        setBackgroundColor(data.background_color || '');
        setFeeling(data.feeling || '');
        setLocation(data.location || '');
        setTaggedFriends((data.tagged_users as string[]) || []);
      }
    };

    loadDraft();
  }, [user, dialogOpen]);

  // Detect links in content
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    if (matches && matches[0] !== detectedLink) {
      setDetectedLink(matches[0]);
      fetchLinkPreview(matches[0]);
    }
  }, [content]);

  const fetchLinkPreview = async (url: string) => {
    try {
      // Simple link preview - in production, use a proper service
      const response = await fetch(url);
      const html = await response.text();
      
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);

      setLinkPreview({
        url,
        title: titleMatch?.[1] || url,
        description: descriptionMatch?.[1] || '',
        image: imageMatch?.[1] || ''
      });
    } catch (error) {
      console.error('Error fetching link preview:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Veuillez ajouter du contenu ou un média');
      return;
    }

    if (!user) return;
    setIsSubmitting(true);

    try {
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          privacy,
          background_color: backgroundColor || null,
          feeling: feeling || null,
          location: location || null,
          link_preview: linkPreview || null,
          scheduled_for: scheduledFor || null
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload media files
      if (mediaFiles.length > 0) {
        setUploadProgress(30);
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(fileName);

          const mediaType = file.type.startsWith('video') ? 'video' : 
                           file.type === 'image/gif' ? 'gif' : 'image';

          await supabase.from('post_media').insert({
            post_id: post.id,
            media_url: publicUrl,
            media_type: mediaType,
            order_index: i
          });
        }
        setUploadProgress(70);
      }

      // Tag friends
      if (taggedFriends.length > 0) {
        await supabase.from('post_tags').insert(
          taggedFriends.map(friendId => ({
            post_id: post.id,
            tagged_user_id: friendId,
            tagged_by: user.id
          }))
        );
      }

      // Clear draft
      await supabase
        .from('post_drafts')
        .delete()
        .eq('user_id', user.id);

      setUploadProgress(100);
      toast.success(scheduledFor ? 'Post programmé avec succès' : 'Post publié avec succès');
      
      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setPrivacy('public');
      setFeeling('');
      setLocation('');
      setTaggedFriends([]);
      setBackgroundColor('');
      setLinkPreview(null);
      setScheduledFor('');
      setDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['smart-feed'] });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const PrivacyIcon = PRIVACY_ICONS[privacy];

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent/5 transition-colors mb-6"
        onClick={() => setDialogOpen(true)}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted rounded-full px-4 py-3 text-muted-foreground">
              Exprimez-vous, {profile?.name?.split(' ')[0]}...
            </div>
          </div>
          
          <div className="flex items-center justify-around mt-3 pt-3 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/live');
              }}
            >
              <Video className="h-5 w-5 text-red-500" />
              <span className="hidden sm:inline">Vidéo en direct</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            >
              <Image className="h-5 w-5 text-green-500" />
              <span className="hidden sm:inline">Photo/vidéo</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 gap-2"
            >
              <Smile className="h-5 w-5 text-yellow-500" />
              <span className="hidden sm:inline">Humeur/activité</span>
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une publication</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{profile?.name}</div>
                <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <PrivacyIcon className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Amis
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        Privé
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Que voulez-vous dire, ${profile?.name?.split(' ')[0]} ?`}
              className={`min-h-[120px] border-0 focus-visible:ring-0 resize-none ${
                backgroundColor ? 'text-white font-bold text-center flex items-center justify-center text-2xl' : 'text-lg'
              }`}
              style={backgroundColor ? {
                background: backgroundColor,
                minHeight: '280px',
                fontSize: content.length < 50 ? '32px' : content.length < 100 ? '24px' : '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
              } : {}}
            />

            {!backgroundColor && (
              <MediaUploader 
                files={mediaFiles} 
                setFiles={setMediaFiles} 
                previews={mediaPreviews} 
                setPreviews={setMediaPreviews}
                inputRef={fileInputRef}
              />
            )}
            
            {linkPreview && <LinkPreview preview={linkPreview} onRemove={() => setLinkPreview(null)} />}

            {(feeling || location || taggedFriends.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {feeling && (
                  <div className="flex items-center gap-1 bg-accent px-3 py-1.5 rounded-full text-sm">
                    <Smile className="h-3.5 w-3.5" />
                    <span>{feeling}</span>
                    <X 
                      className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" 
                      onClick={() => setFeeling('')}
                    />
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1 bg-accent px-3 py-1.5 rounded-full text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{location}</span>
                    <X 
                      className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" 
                      onClick={() => setLocation('')}
                    />
                  </div>
                )}
                {taggedFriends.map((friendId) => (
                  <div key={friendId} className="flex items-center gap-1 bg-accent px-3 py-1.5 rounded-full text-sm">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Ami tagué</span>
                    <X 
                      className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" 
                      onClick={() => setTaggedFriends(prev => prev.filter(id => id !== friendId))}
                    />
                  </div>
                ))}
              </div>
            )}

            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="h-2" />
            )}

            <Card className="p-3">
              <div className="text-sm font-medium mb-2">Ajouter à votre publication</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-4 w-4 text-green-500" />
                  Photo/Vidéo
                </Button>
                <FriendTagger selectedFriends={taggedFriends} onSelectFriends={setTaggedFriends} />
                <FeelingSelector selected={feeling} onSelect={setFeeling} />
                <LocationInput selected={location} onSelect={setLocation} />
                {!mediaFiles.length && <BackgroundSelector selected={backgroundColor} onSelect={setBackgroundColor} />}
              </div>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
            >
              {isSubmitting ? 'Publication...' : scheduledFor ? 'Programmer' : 'Publier'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};