import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, GraduationCap, Home, Heart, Calendar, Mail, Phone, Globe, Edit } from 'lucide-react';
import { EditAboutDialog } from './EditAboutDialog';

interface AboutSectionProps {
  profile: any;
  isOwnProfile: boolean;
  onProfileUpdate?: () => void;
}

export const AboutSection = ({ profile, isOwnProfile, onProfileUpdate }: AboutSectionProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<'bio' | 'general' | 'work' | 'contact'>('bio');

  const handleEdit = (section: 'bio' | 'general' | 'work' | 'contact') => {
    setEditSection(section);
    setEditDialogOpen(true);
  };
  const sections = [
    {
      title: 'Informations générales',
      items: [
        { icon: MapPin, label: 'Ville actuelle', value: profile.current_city },
        { icon: Home, label: 'Ville d\'origine', value: profile.hometown },
        { icon: Heart, label: 'Statut', value: profile.relationship_status },
        { icon: Calendar, label: 'Date de naissance', value: profile.birthdate },
      ]
    },
    {
      title: 'Travail et formation',
      items: [
        { icon: Briefcase, label: 'Travail', value: profile.work },
        { icon: GraduationCap, label: 'Formation', value: profile.education },
      ]
    },
    {
      title: 'Coordonnées',
      items: [
        { icon: Mail, label: 'Email', value: profile.public_email },
        { icon: Phone, label: 'Téléphone', value: profile.phone },
        { icon: Globe, label: 'Site web', value: profile.website },
      ]
    }
  ];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bio */}
        {(profile.bio || isOwnProfile) && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Biographie</CardTitle>
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit('bio')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {profile.bio ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">Ajoutez une biographie à votre profil</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Other Sections */}
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter(item => item.value);
          const sectionKey = idx === 0 ? 'general' : idx === 1 ? 'work' : 'contact';
          
          if (visibleItems.length === 0 && !isOwnProfile) return null;

          return (
            <Card key={section.title}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{section.title}</CardTitle>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(sectionKey as any)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleItems.length > 0 ? (
                  visibleItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                        <div className="font-medium">{item.value}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    Ajoutez des informations à cette section
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Empty state */}
        {!profile.bio && sections.every(s => s.items.every(i => !i.value)) && !isOwnProfile && (
          <Card className="md:col-span-2">
            <CardContent className="text-center py-12 text-muted-foreground">
              Aucune information disponible
            </CardContent>
          </Card>
        )}
      </div>

      <EditAboutDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        section={editSection}
        onSuccess={() => onProfileUpdate?.()}
      />
    </>
  );
};
