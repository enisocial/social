import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  section: 'bio' | 'general' | 'work' | 'contact';
  onSuccess: () => void;
}

export const EditAboutDialog = ({ open, onOpenChange, profile, section, onSuccess }: EditAboutDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: profile?.bio || '',
    current_city: profile?.current_city || '',
    hometown: profile?.hometown || '',
    relationship_status: profile?.relationship_status || '',
    birthdate: profile?.birthdate || '',
    work: profile?.work || '',
    education: profile?.education || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    website: profile?.website || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {};

      if (section === 'bio') {
        updates.bio = formData.bio.trim() || null;
      } else if (section === 'general') {
        updates.current_city = formData.current_city.trim() || null;
        updates.hometown = formData.hometown.trim() || null;
        updates.relationship_status = formData.relationship_status.trim() || null;
        updates.birthdate = formData.birthdate || null;
      } else if (section === 'work') {
        updates.work = formData.work.trim() || null;
        updates.education = formData.education.trim() || null;
      } else if (section === 'contact') {
        updates.email = formData.email.trim() || null;
        updates.phone = formData.phone.trim() || null;
        updates.website = formData.website.trim() || null;
      }

      console.log('🎯 EDIT ABOUT - UPDATING:', updates);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Informations mises à jour');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    switch (section) {
      case 'bio':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bio">Biographie</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Parlez de vous..."
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.bio.length}/500 caractères
              </p>
            </div>
          </div>
        );

      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="current_city">Ville actuelle</Label>
              <Input
                id="current_city"
                value={formData.current_city}
                onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                placeholder="Paris, France"
              />
            </div>
            <div>
              <Label htmlFor="hometown">Ville d'origine</Label>
              <Input
                id="hometown"
                value={formData.hometown}
                onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                placeholder="Lyon, France"
              />
            </div>
            <div>
              <Label htmlFor="relationship_status">Statut relationnel</Label>
              <Input
                id="relationship_status"
                value={formData.relationship_status}
                onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
                placeholder="Célibataire, En couple, Marié(e)..."
              />
            </div>
            <div>
              <Label htmlFor="birthdate">Date de naissance</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              />
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="work">Travail</Label>
              <Input
                id="work"
                value={formData.work}
                onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                placeholder="Entreprise ou poste"
              />
            </div>
            <div>
              <Label htmlFor="education">Formation</Label>
              <Input
                id="education"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="École ou université"
              />
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div>
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://monsite.com"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getTitleBySection = () => {
    switch (section) {
      case 'bio': return 'Modifier la biographie';
      case 'general': return 'Modifier les informations générales';
      case 'work': return 'Modifier travail et formation';
      case 'contact': return 'Modifier les coordonnées';
      default: return 'Modifier';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitleBySection()}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {renderFields()}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
