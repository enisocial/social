import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, X, UserPlus, Share2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { usePhotos } from "@/hooks/usePhotos";
import { usePhotoTags } from "@/hooks/usePhotoTags";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareDialog } from "@/components/ShareDialog";

const AlbumDetail = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [photoToShare, setPhotoToShare] = useState<string | null>(null);

  const { data: album } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_albums')
        .select(`
          *,
          profiles:user_id (username, name, avatar_url)
        `)
        .eq('id', albumId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!albumId,
  });

  const { photos, uploadPhoto } = usePhotos(albumId);
  const { tags } = usePhotoTags(selectedPhoto || '');

  const isOwnAlbum = user?.id === album?.user_id;

  const handleUpload = async () => {
    if (!selectedFile || !albumId) return;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      await uploadPhoto.mutateAsync({
        image_url: publicUrl,
        album_id: albumId,
        caption,
      });

      setSelectedFile(null);
      setCaption("");
      setUploadOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la photo",
        variant: "destructive",
      });
    }
  };

  if (!album) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Album introuvable</h2>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{album.name}</h1>
              {album.description && (
                <p className="text-muted-foreground">{album.description}</p>
              )}
              {album.system_album && (
                <div className="mt-2 inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  Album géré automatiquement
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={album.profiles.avatar_url} />
                  <AvatarFallback>{album.profiles.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  Par {album.profiles.name}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwnAlbum && !album.system_album && (
                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="w-4 h-4 mr-2" />
                      Ajouter des photos
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une photo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="photo">Photo</Label>
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="caption">Légende</Label>
                        <Textarea
                          id="caption"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="Ajoutez une légende..."
                        />
                      </div>
                      <Button onClick={handleUpload} className="w-full" disabled={!selectedFile}>
                        Ajouter
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos?.map((photo) => (
            <Card 
              key={photo.id}
              className="overflow-hidden group"
            >
              <CardContent className="p-0 relative">
                <div 
                  className="relative aspect-square bg-muted cursor-pointer"
                  onClick={() => setSelectedPhoto(photo.id)}
                >
                  <img 
                    src={photo.image_url} 
                    alt={photo.caption || 'Photo'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToShare(photo.id);
                        setShareDialogOpen(true);
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                  </div>
                </div>
                {photo.caption && (
                  <div className="p-2">
                    <p className="text-sm truncate">{photo.caption}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {photos?.length === 0 && (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucune photo</h3>
            <p className="text-muted-foreground mb-4">
              {isOwnAlbum 
                ? "Commencez à ajouter des photos à cet album"
                : "Cet album ne contient pas encore de photos"}
            </p>
          </div>
        )}

        {/* Photo Detail Dialog */}
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Photo</DialogTitle>
              </DialogHeader>
              {photos?.find(p => p.id === selectedPhoto) && (
                <div className="space-y-4">
                  <img
                    src={photos.find(p => p.id === selectedPhoto)?.image_url}
                    alt="Photo"
                    className="w-full rounded-lg"
                  />
                  {photos.find(p => p.id === selectedPhoto)?.caption && (
                    <p className="text-sm">{photos.find(p => p.id === selectedPhoto)?.caption}</p>
                  )}
                  {tags && tags.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Personnes identifiées :</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <div key={tag.id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={tag.profiles.avatar_url} />
                              <AvatarFallback>{tag.profiles.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{tag.profiles.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          contentType="photo"
          contentId={photoToShare || ''}
          contentData={{
            image_url: photos?.find(p => p.id === photoToShare)?.image_url,
            content: photos?.find(p => p.id === photoToShare)?.caption,
          }}
        />
      </main>
    </div>
  );
};

export default AlbumDetail;
