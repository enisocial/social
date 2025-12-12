import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, GraduationCap, Home, Heart, Calendar, Mail, Phone, Globe, Edit, Lock, Shield } from 'lucide-react';
import { EditAboutDialog } from './EditAboutDialog';

interface AboutSectionProps {
  profile: any;
  isOwnProfile: boolean;
  onProfileUpdate?: () => void;
}

export const AboutSection = ({ profile, isOwnProfile, onProfileUpdate }: AboutSectionProps) => {
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<'bio' | 'general' | 'work' | 'contact'>('bio');

  // DEBUG: Log pour voir si AboutSection se rend
  console.log('🎯 ABOUT RENDER:', { profile, isOwnProfile, user });



  // Vérifier si l'utilisateur actuel est ami avec le propriétaire du profil
  const { data: isFriend = false } = useQuery({
    queryKey: ['friendship-status', user?.id, profile?.id],
    queryFn: async () => {
      if (!user || !profile?.id || user.id === profile.id) return false;

      const { data } = await supabase
        .from('friend_requests')
        .select('status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .single();

      return !!data;
    },
    enabled: !!user && !!profile?.id && user.id !== profile?.id
  });

  const handleEdit = (section: 'bio' | 'general' | 'work' | 'contact') => {
    setEditSection(section);
    setEditDialogOpen(true);
  };

  // Fonction pour vérifier si une information est visible
  const isVisible = (privacySetting: string) => {
    if (isOwnProfile) return true; // Le propriétaire voit toujours ses infos

    switch (privacySetting) {
      case 'public':
        return true;
      case 'friends':
        return isFriend;
      case 'private':
        return false;
      default:
        return isFriend; // Par défaut, amis seulement
    }
  };

  const sections = [
    {
      title: 'Informations générales',
      items: [
        {
          icon: MapPin,
          label: 'Ville actuelle',
          value: profile.current_city,
          privacyKey: 'privacy_current_city'
        },
        {
          icon: Home,
          label: 'Ville d\'origine',
          value: profile.hometown,
          privacyKey: 'privacy_hometown'
        },
        {
          icon: Heart,
          label: 'Statut relationnel',
          value: profile.relationship_status,
          privacyKey: 'privacy_relationship_status'
        },
        {
          icon: Calendar,
          label: 'Date de naissance',
          value: profile.birthdate,
          privacyKey: 'privacy_birthdate'
        },
      ]
    },
    {
      title: 'Travail et formation',
      items: [
        {
          icon: Briefcase,
          label: 'Travail',
          value: profile.work,
          privacyKey: 'privacy_work'
        },
        {
          icon: GraduationCap,
          label: 'Formation',
          value: profile.education,
          privacyKey: 'privacy_education'
        },
      ]
    },
    {
      title: 'Coordonnées',
      items: [
        {
          icon: Mail,
          label: 'Email',
          value: profile.email, // Utilisation de la vraie donnée
          privacyKey: 'privacy_email'
        },
        {
          icon: Phone,
          label: 'Téléphone',
          value: profile.phone,
          privacyKey: 'privacy_phone'
        },
        {
          icon: Globe,
          label: 'Site web',
          value: profile.website,
          privacyKey: 'privacy_website'
        },
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
              <CardTitle className="flex items-center gap-2">
                Biographie
                {!isOwnProfile && !isVisible(profile.privacy_bio || 'friends') && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
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
                isVisible(profile.privacy_bio || 'friends') ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="italic">Cette information est privée</span>
                  </div>
                )
              ) : (
                <p className="text-muted-foreground italic">Ajoutez une biographie à votre profil</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Other Sections */}
        {sections.map((section, idx) => {
          // Filtrer les items selon la confidentialité
          const visibleItems = section.items.filter(item =>
            item.value && isVisible(profile[item.privacyKey] || 'friends')
          );
          const sectionKey = idx === 0 ? 'general' : idx === 1 ? 'work' : 'contact';

          // Pour les propriétaires, montrer aussi les items vides pour édition
          const allItems = isOwnProfile ? section.items.filter(item => item.value) : visibleItems;

          if (allItems.length === 0 && !isOwnProfile) return null;

          return (
            <Card key={section.title}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{section.title}</CardTitle>
                {isOwnProfile && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(sectionKey as any)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {allItems.length > 0 ? (
                  allItems.map((item, idx) => {
                    const isItemVisible = isVisible(profile[item.privacyKey] || 'friends');
                    const privacyIcon = !isOwnProfile && !isItemVisible ? Lock : null;

                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {item.label}
                            {privacyIcon && <Lock className="h-3 w-3" />}
                            {!isOwnProfile && !isItemVisible && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Privé</span>
                            )}
                          </div>
                          <div className="font-medium">{item.value}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground italic text-sm">
                    {isOwnProfile
                      ? "Ajoutez des informations à cette section"
                      : "Aucune information visible"
                    }
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
