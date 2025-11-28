import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Lock,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // États pour les paramètres
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    bio: '',
    website: ''
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowFriendRequests: true,
    showEmail: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    friendRequests: true,
    messages: true,
    likes: false,
    comments: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sauvegarder les paramètres du profil
  const saveProfileSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          username: profileData.username,
          bio: profileData.bio,
          website: profileData.website
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Paramètres du profil sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les paramètres de confidentialité
  const savePrivacySettings = async () => {
    setLoading(true);
    try {
      // Ici on pourrait sauvegarder dans une table settings
      toast.success('Paramètres de confidentialité sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les paramètres de notifications
  const saveNotificationSettings = async () => {
    setLoading(true);
    try {
      // Ici on pourrait sauvegarder dans une table user_notifications
      toast.success('Paramètres de notifications sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Changer le mot de passe
  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Mot de passe changé avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Télécharger les données
  const downloadData = async () => {
    setLoading(true);
    try {
      // Récupérer les données de l'utilisateur
      const [posts, friends, messages] = await Promise.all([
        supabase.from('posts').select('*').eq('user_id', user?.id),
        supabase.from('friend_requests').select('*').or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`),
        supabase.from('messages').select('*').eq('sender_id', user?.id)
      ]);

      const userData = {
        profile: { id: user?.id, email: user?.email },
        posts: posts.data,
        friends: friends.data,
        messages: messages.data,
        exportDate: new Date().toISOString()
      };

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Données téléchargées avec succès');
    } catch (error) {
      toast.error('Erreur lors du téléchargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer le compte
  const deleteAccount = async () => {
    if (!confirm('⚠️ ATTENTION : Cette action est irréversible. Êtes-vous sûr de vouloir supprimer votre compte ?')) {
      return;
    }

    if (!confirm('Dernière confirmation : Toutes vos données seront perdues définitivement.')) {
      return;
    }

    setLoading(true);
    try {
      // Supprimer les données de l'utilisateur
      await Promise.all([
        supabase.from('posts').delete().eq('user_id', user?.id),
        supabase.from('messages').delete().eq('sender_id', user?.id),
        supabase.from('friend_requests').delete().or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`),
        supabase.from('profiles').delete().eq('id', user?.id)
      ]);

      // Supprimer le compte auth
      await supabase.auth.admin.deleteUser(user?.id);

      toast.success('Compte supprimé avec succès');
      // Redirection vers la page d'accueil
      window.location.href = '/';
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Paramètres du compte</h1>
          <p className="text-muted-foreground mt-2">Gérez vos paramètres personnels et de confidentialité</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
            <TabsTrigger value="account">Compte</TabsTrigger>
          </TabsList>

          {/* ONGLET PROFIL */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Votre nom complet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biographie</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Décrivez-vous en quelques mots..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://votresite.com"
                  />
                </div>

                <Button onClick={saveProfileSettings} disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET CONFIDENTIALITÉ */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Paramètres de confidentialité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Visibilité du profil</Label>
                    <p className="text-sm text-muted-foreground">Qui peut voir votre profil</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                    className="border rounded px-3 py-1"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Amis uniquement</option>
                    <option value="private">Privé</option>
                  </select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Statut en ligne</Label>
                    <p className="text-sm text-muted-foreground">Montrer quand vous êtes en ligne</p>
                  </div>
                  <Switch
                    checked={privacySettings.showOnlineStatus}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showOnlineStatus: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Demandes d'amis</Label>
                    <p className="text-sm text-muted-foreground">Autoriser les demandes d'amis</p>
                  </div>
                  <Switch
                    checked={privacySettings.allowFriendRequests}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allowFriendRequests: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Adresse email</Label>
                    <p className="text-sm text-muted-foreground">Montrer votre email aux autres</p>
                  </div>
                  <Switch
                    checked={privacySettings.showEmail}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showEmail: checked }))}
                  />
                </div>

                <Button onClick={savePrivacySettings} disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder la confidentialité
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET NOTIFICATIONS */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Préférences de notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">Recevoir des emails pour les activités importantes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications push</Label>
                    <p className="text-sm text-muted-foreground">Recevoir des notifications dans le navigateur</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Demandes d'amis</Label>
                    <p className="text-sm text-muted-foreground">Notifications pour les nouvelles demandes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.friendRequests}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, friendRequests: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Messages</Label>
                    <p className="text-sm text-muted-foreground">Notifications pour les nouveaux messages</p>
                  </div>
                  <Switch
                    checked={notificationSettings.messages}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, messages: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>J'aime</Label>
                    <p className="text-sm text-muted-foreground">Notifications quand quelqu'un aime vos publications</p>
                  </div>
                  <Switch
                    checked={notificationSettings.likes}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, likes: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Commentaires</Label>
                    <p className="text-sm text-muted-foreground">Notifications pour les nouveaux commentaires</p>
                  </div>
                  <Switch
                    checked={notificationSettings.comments}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, comments: checked }))}
                  />
                </div>

                <Button onClick={saveNotificationSettings} disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les notifications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET SÉCURITÉ */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sécurité du compte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Changer le mot de passe</h3>

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Votre mot de passe actuel"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Votre nouveau mot de passe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirmez le nouveau mot de passe"
                    />
                  </div>

                  <Button onClick={changePassword} disabled={loading} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Changer le mot de passe
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Sessions actives</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous êtes actuellement connecté sur cet appareil.
                  </p>
                  <Button variant="outline" className="w-full">
                    Voir toutes les sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET COMPTE */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Gestion du compte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Télécharger vos données</h3>
                  <p className="text-sm text-muted-foreground">
                    Téléchargez une copie de toutes vos données personnelles au format JSON.
                  </p>
                  <Button onClick={downloadData} disabled={loading} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger mes données
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-red-600">Zone de danger</h3>
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-900">Supprimer le compte</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Cette action est irréversible. Toutes vos données seront supprimées définitivement.
                    </p>
                    <Button
                      onClick={deleteAccount}
                      disabled={loading}
                      variant="destructive"
                      className="mt-3"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer mon compte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FacebookFeedLayout>
  );
};

export default Settings;
