import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon, Plus, Images } from "lucide-react";
import { usePhotoAlbums } from "@/hooks/usePhotoAlbums";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";

const PhotoAlbums = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { albums, createAlbum } = usePhotoAlbums(user?.id);

  const handleCreate = async () => {
    if (!name.trim()) return;

    await createAlbum.mutateAsync({
      name,
      description,
    });

    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Images className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Albums Photos</h1>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
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
                  <Label htmlFor="name">Nom de l'album</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vacances 2024..."
                  />
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre album..."
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Créer l'album
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums?.map((album) => (
            <Card 
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
            </Card>
          ))}
        </div>

        {albums?.length === 0 && (
          <div className="text-center py-12">
            <Images className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun album pour le moment</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier album photo !
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PhotoAlbums;
