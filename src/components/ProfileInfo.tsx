import { Profile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import { MapPin, Home, Phone, Mail, Briefcase, GraduationCap, Heart, Globe, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProfileInfoProps {
  profile: Profile;
  settings?: {
    show_location: boolean;
    show_phone: boolean;
    show_email: boolean;
    show_birthdate: boolean;
    show_relationship: boolean;
    show_work: boolean;
  };
  isOwnProfile: boolean;
}

export const ProfileInfo = ({ profile, settings, isOwnProfile }: ProfileInfoProps) => {
  const infoItems = [];

  // Ville actuelle
  if (profile.current_city && (isOwnProfile || settings?.show_location)) {
    infoItems.push({
      icon: <MapPin className="h-4 w-4" />,
      label: 'Habite à',
      value: profile.current_city
    });
  }

  // Ville d'origine
  if (profile.hometown && (isOwnProfile || settings?.show_location)) {
    infoItems.push({
      icon: <Home className="h-4 w-4" />,
      label: 'Originaire de',
      value: profile.hometown
    });
  }

  // Localisation (pays/région)
  if ((profile.country || profile.region) && (isOwnProfile || settings?.show_location)) {
    const location = [profile.city, profile.region, profile.country].filter(Boolean).join(', ');
    if (location) {
      infoItems.push({
        icon: <MapPin className="h-4 w-4" />,
        label: 'Localisation',
        value: location
      });
    }
  }

  // Téléphone
  if (profile.phone && (isOwnProfile || settings?.show_phone)) {
    infoItems.push({
      icon: <Phone className="h-4 w-4" />,
      label: 'Téléphone',
      value: profile.phone
    });
  }

  // Email public
  if (profile.public_email && (isOwnProfile || settings?.show_email)) {
    infoItems.push({
      icon: <Mail className="h-4 w-4" />,
      label: 'Email',
      value: profile.public_email
    });
  }

  // Site web
  if (profile.website) {
    infoItems.push({
      icon: <Globe className="h-4 w-4" />,
      label: 'Site web',
      value: profile.website,
      link: true
    });
  }

  // Date de naissance
  if (profile.birthdate && (isOwnProfile || settings?.show_birthdate)) {
    infoItems.push({
      icon: <Calendar className="h-4 w-4" />,
      label: 'Date de naissance',
      value: format(new Date(profile.birthdate), 'dd MMMM yyyy', { locale: fr })
    });
  }

  // Statut relationnel
  if (profile.relationship_status && (isOwnProfile || settings?.show_relationship)) {
    infoItems.push({
      icon: <Heart className="h-4 w-4" />,
      label: 'Statut',
      value: profile.relationship_status
    });
  }

  // Travail
  if (profile.work && (isOwnProfile || settings?.show_work)) {
    infoItems.push({
      icon: <Briefcase className="h-4 w-4" />,
      label: 'Travaille chez',
      value: profile.work
    });
  }

  // Éducation
  if (profile.education && (isOwnProfile || settings?.show_work)) {
    infoItems.push({
      icon: <GraduationCap className="h-4 w-4" />,
      label: 'A étudié à',
      value: profile.education
    });
  }

  if (infoItems.length === 0 && !profile.bio) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section À propos */}
      {profile.bio && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">À propos</h2>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </Card>
      )}

      {/* Section Informations */}
      {infoItems.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Informations</h2>
          <div className="space-y-3">
            {infoItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <div className="text-muted-foreground mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  {item.link ? (
                    <a
                      href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all font-medium"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm text-foreground break-words font-medium">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
