import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Group, useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroupSettingsProps {
  group: Group;
}

export function GroupSettings({ group }: GroupSettingsProps) {
  const navigate = useNavigate();
  const { updateGroup, deleteGroup } = useGroups();
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || "",
    privacy: group.privacy,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleUpdate = async () => {
    await updateGroup.mutateAsync({
      groupId: group.id,
      updates: formData,
    });
  };

  const handleDelete = async () => {
    await deleteGroup.mutateAsync(group.id);
    navigate("/groups");
  };

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "cover"
  ) => {
    try {
      const setter = type === "avatar" ? setUploadingAvatar : setUploadingCover;
      setter(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${group.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `groups/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      await updateGroup.mutateAsync({
        groupId: group.id,
        updates: {
          [type === "avatar" ? "avatar_url" : "cover_url"]: publicUrl,
        },
      });

      toast.success(
        type === "avatar"
          ? "Photo de profil mise à jour"
          : "Photo de couverture mise à jour"
      );
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      const setter = type === "avatar" ? setUploadingAvatar : setUploadingCover;
      setter(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du groupe</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacy">Confidentialité</Label>
            <Select
              value={formData.privacy}
              onValueChange={(value: "public" | "private") =>
                setFormData({ ...formData, privacy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Privé</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formData.privacy === "public"
                ? "Tout le monde peut voir ce groupe et ses publications"
                : "Seuls les membres peuvent voir ce groupe et ses publications"}
            </p>
          </div>

          <Button onClick={handleUpdate} disabled={updateGroup.isPending}>
            {updateGroup.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Photos du groupe */}
      <Card>
        <CardHeader>
          <CardTitle>Photos du groupe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Photo de profil</Label>
            <div className="flex items-center gap-4">
              {group.avatar_url && (
                <img
                  src={group.avatar_url}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "avatar");
                  }}
                  disabled={uploadingAvatar}
                />
                <Button
                  variant="outline"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingAvatar ? "Téléchargement..." : "Changer la photo"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Photo de couverture</Label>
            <div className="space-y-4">
              {group.cover_url && (
                <img
                  src={group.cover_url}
                  alt="Couverture"
                  className="h-40 w-full rounded-lg object-cover"
                />
              )}
              <div>
                <Input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "cover");
                  }}
                  disabled={uploadingCover}
                />
                <Button
                  variant="outline"
                  disabled={uploadingCover}
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingCover ? "Téléchargement..." : "Changer la couverture"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Zone de danger */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer le groupe
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Cela supprimera définitivement le
                  groupe "{group.name}", tous ses membres, publications et événements.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
