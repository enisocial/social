import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAccountSettings, PostPrivacy } from '@/hooks/useAccountSettings';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AvatarEditor } from '@/components/AvatarEditor';
import { CoverPhotoEditor } from '@/components/CoverPhotoEditor';
import { User, Lock, Bell, Eye, Shield, Image, ArrowLeft, MapPin, Phone, Mail, Briefcase, GraduationCap, Heart, Calendar, Globe, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile(user?.id);
  const { settings, updateSettings } = useAccountSettings(user?.id);
  const { theme, setTheme } = useTheme();
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [hometown, setHometown] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [phone, setPhone] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [work, setWork] = useState('');
  const [education, setEducation] = useState('');
  
  const [profileVisibility, setProfileVisibility] = useState<PostPrivacy>('public');
  const [allowMessagesFrom, setAllowMessagesFrom] = useState<PostPrivacy>('public');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showBirthdate, setShowBirthdate] = useState(true);
  const [showRelationship, setShowRelationship] = useState(true);
  const [showWork, setShowWork] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio || '');
      setCity(profile.city || '');
      setRegion(profile.region || '');
      setCountry(profile.country || '');
      setHometown(profile.hometown || '');
      setCurrentCity(profile.current_city || '');
      setPhone(profile.phone || '');
      setPublicEmail(profile.public_email || '');
      setWebsite(profile.website || '');
      setBirthdate(profile.birthdate || '');
      setRelationshipStatus(profile.relationship_status || '');
      setWork(profile.work || '');
      setEducation(profile.education || '');
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setProfileVisibility(settings.profile_visibility);
      setAllowMessagesFrom(settings.allow_messages_from);
      setShowOnlineStatus(settings.show_online_status);
      setShowLocation(settings.show_location ?? true);
      setShowPhone(settings.show_phone ?? false);
      setShowEmail(settings.show_email ?? false);
      setShowBirthdate(settings.show_birthdate ?? true);
      setShowRelationship(settings.show_relationship ?? true);
      setShowWork(settings.show_work ?? true);
    }
  }, [settings]);

  const handleSaveProfile = async () => {
    await updateProfile({ 
      name, 
      bio,
      city,
      region,
      country,
      hometown,
      current_city: currentCity,
      phone,
      public_email: publicEmail,
      website,
      birthdate,
      relationship_status: relationshipStatus,
      work,
      education
    });
  };

  const handleSavePrivacy = async () => {
    await updateSettings({
      profile_visibility: profileVisibility,
      allow_messages_from: allowMessagesFrom,
      show_online_status: showOnlineStatus,
      show_location: showLocation,
      show_phone: showPhone,
      show_email: showEmail,
      show_birthdate: showBirthdate,
      show_relationship: showRelationship,
      show_work: showWork,
    });
  };

  if (loading || !profile || !settings) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const privacyOptions = [
    { value: 'public', label: 'Public', description: 'Tout le monde peut voir' },
    { value: 'friends', label: 'Amis', description: 'Seulement vos amis' },
    { value: 'private', label: 'Privé', description: 'Seulement vous' },
  ];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-8 h-8" />
          Paramètres
        </h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Lock className="w-4 h-4" />
            Confidentialité
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Image className="w-4 h-4" />
            Apparence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Parlez de vous..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Nom d'utilisateur</Label>
                <Input value={profile.username} disabled className="bg-muted" />
                <p className="text-sm text-muted-foreground">
                  Le nom d'utilisateur ne peut pas être modifié
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Localisation
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Région</Label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Île-de-France"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="France"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ville d'origine</Label>
                  <Input
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    placeholder="Marseille"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ville actuelle</Label>
                  <Input
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Coordonnées
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  type="tel"
                />
              </div>

              <div className="space-y-2">
                <Label>Email public</Label>
                <Input
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  placeholder="contact@exemple.com"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site web
                </Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://exemple.com"
                  type="url"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Informations personnelles</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de naissance
                </Label>
                <Input
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  type="date"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Statut relationnel
                </Label>
                <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Célibataire</SelectItem>
                    <SelectItem value="in_relationship">En couple</SelectItem>
                    <SelectItem value="engaged">Fiancé(e)</SelectItem>
                    <SelectItem value="married">Marié(e)</SelectItem>
                    <SelectItem value="complicated">C'est compliqué</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Professionnel
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Travail</Label>
                <Input
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  placeholder="Développeur chez TechCorp"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Éducation
                </Label>
                <Input
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Master Informatique, Université Paris"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} size="lg">
              Enregistrer toutes les modifications
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Paramètres de confidentialité
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Visibilité du profil</Label>
                <Select value={profileVisibility} onValueChange={(value: PostPrivacy) => setProfileVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {privacyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Qui peut voir votre profil
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Messages autorisés de</Label>
                <Select value={allowMessagesFrom} onValueChange={(value: PostPrivacy) => setAllowMessagesFrom(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {privacyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Qui peut vous envoyer des messages
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Afficher le statut en ligne
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Les autres utilisateurs peuvent voir si vous êtes en ligne
                  </p>
                </div>
                <Switch
                  checked={showOnlineStatus}
                  onCheckedChange={setShowOnlineStatus}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Informations visibles sur le profil</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Afficher la localisation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ville, région et pays
                    </p>
                  </div>
                  <Switch
                    checked={showLocation}
                    onCheckedChange={setShowLocation}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Afficher le téléphone
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Votre numéro de téléphone
                    </p>
                  </div>
                  <Switch
                    checked={showPhone}
                    onCheckedChange={setShowPhone}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Afficher l'email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Votre adresse email publique
                    </p>
                  </div>
                  <Switch
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Afficher la date de naissance
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Votre date de naissance
                    </p>
                  </div>
                  <Switch
                    checked={showBirthdate}
                    onCheckedChange={setShowBirthdate}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Afficher le statut relationnel
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Célibataire, en couple, etc.
                    </p>
                  </div>
                  <Switch
                    checked={showRelationship}
                    onCheckedChange={setShowRelationship}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Afficher les informations professionnelles
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Travail et éducation
                    </p>
                  </div>
                  <Switch
                    checked={showWork}
                    onCheckedChange={setShowWork}
                  />
                </div>
              </div>

              <Button onClick={handleSavePrivacy} className="w-full">
                Enregistrer les paramètres de confidentialité
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Thème
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mode d'affichage</Label>
                  <p className="text-sm text-muted-foreground">
                    Choisissez votre thème préféré (enregistré automatiquement)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Clair
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Sombre
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    Système
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Photo de profil</h2>
            <div className="flex items-center gap-4">
              <AvatarEditor
                currentAvatar={profile.avatar_url}
                userName={profile.name}
                userId={profile.id}
                onAvatarUpdate={() => window.location.reload()}
              />
              <div>
                <p className="font-medium">{profile.name}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Photo de couverture</h2>
            <div className="space-y-4">
              {profile.cover_photo_url && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={profile.cover_photo_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CoverPhotoEditor
                currentCover={profile.cover_photo_url}
                userId={profile.id}
                onCoverUpdate={() => window.location.reload()}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
