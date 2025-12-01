import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Lock,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Sparkles,
  Globe,
  Zap,
  Heart,
  Activity,
  CheckCircle,
  AlertTriangle,
  Key,
  Database,
  Smartphone,
  MessagesSquare
} from 'lucide-react';
import { usePrivacySettings, PrivacySettings } from '@/hooks/usePrivacySettings';
import { useNotificationSettings, NotificationSettings } from '@/hooks/useNotificationSettings';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // États locaux pour les données du profil (chargées depuis Supabase)
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    bio: '',
    website: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Hooks pour les paramètres utilisateur
  const {
    privacySettings,
    isLoading: privacyLoading,
    savePrivacySettings
  } = usePrivacySettings();

  const {
    notificationSettings,
    isLoading: notificationLoading,
    saveNotificationSettings
  } = useNotificationSettings();

  // Charger les données du profil au montage
  const { data: profile, isLoading: profileLoading } = useQuery({
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
    enabled: !!user,
  });

  // Mettre à jour les données locales quand le profil est chargé
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        website: profile.website || ''
      });
    }
  }, [profile]);

  // Sauvegarder les paramètres du profil
  const saveProfileSettings = async () => {
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
    }
  };

  // Changer le mot de passe
  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

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
    }
  };

  // Télécharger les données
  const downloadData = async () => {
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
    }
  };

  // Statistiques du compte
  const accountStats = {
    profileComplete: (profileData.name && profileData.username && profileData.bio) ? 100 : 75,
    securityLevel: 'Élevé',
    lastLogin: 'Aujourd\'hui'
  };

  // États de chargement
  const isLoading = profileLoading || privacyLoading || notificationLoading;

  // Valeurs par défaut si les données ne sont pas encore chargées
  const defaultPrivacySettings = {
    profile_visibility: 'public' as const,
    show_online_status: true,
    allow_messages_from: 'public' as const,
    show_email: false
  };

  const defaultNotificationSettings = {
    emailNotifications: true,
    pushNotifications: true,
    friendRequests: true,
    messages: true,
    likes: false,
    comments: true
  };

  const currentPrivacySettings = privacySettings || defaultPrivacySettings;
  const currentNotificationSettings = notificationSettings || defaultNotificationSettings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* HEADER ULTRA-MODERNE AFRICAIN */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        {/* Fond avec motifs africains subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-teal-500/5 to-cyan-500/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            {/* ICÔNE PRINCIPALE */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <SettingsIcon className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* TITRE PRINCIPAL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Paramètres du compte
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                🛡️ Gérez vos paramètres personnels et de confidentialité
              </p>
            </motion.div>

            {/* STATISTIQUES RAPIDES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 mt-8"
            >
              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-200/50">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Profil {accountStats.profileComplete}% complet
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-teal-200/50">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Sécurité {accountStats.securityLevel}
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-cyan-200/50">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Dernière connexion: {accountStats.lastLogin}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Tabs defaultValue="profile" className="space-y-8">
            {/* ONGLETS ULTRA-MODERNES */}
            <div className="flex justify-center">
              <TabsList className="bg-gradient-to-br from-white/95 via-gray-50/80 to-white/95 dark:from-gray-800/95 dark:via-gray-700/80 dark:to-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2 shadow-xl grid grid-cols-5 w-full max-w-4xl">
                <TabsTrigger
                  value="profile"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Profil</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="privacy"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Confidentialité</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="notifications"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Notifications</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="security"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Sécurité</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="account"
                  className="gap-3 rounded-xl px-6 py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Compte</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ONGLET PROFIL ULTRA-MODERNE */}
            <TabsContent value="profile">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden"
              >
                {/* HEADER PROFIL */}
                <div className="relative p-6 border-b border-emerald-200/30 dark:border-emerald-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Informations du profil</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Personnalisez votre présence sur la plateforme</p>
                    </div>
                  </div>
                </div>

                {/* CONTENU PROFIL */}
                <div className="p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="✨ Votre nom complet"
                        className="h-12 border-emerald-200/50 focus:border-emerald-400 rounded-xl"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="username" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-teal-500" />
                        Nom d'utilisateur
                      </Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="@votreusername"
                        className="h-12 border-teal-200/50 focus:border-teal-400 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bio" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-cyan-500" />
                      Biographie
                    </Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="📝 Décrivez-vous en quelques mots..."
                      rows={4}
                      className="border-cyan-200/50 focus:border-cyan-400 rounded-xl resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="website" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      Site web
                    </Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="🌐 https://votresite.com"
                      className="h-12 border-purple-200/50 focus:border-purple-400 rounded-xl"
                    />
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={saveProfileSettings}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sauvegarde en cours...
                        </div>
                      ) : (
                        '💾 Sauvegarder les modifications'
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ONGLET CONFIDENTIALITÉ ULTRA-MODERNE */}
            <TabsContent value="privacy">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/95 via-teal-50/80 to-white/95 dark:from-gray-800/95 dark:via-teal-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-teal-200/50 dark:border-teal-800/50 overflow-hidden"
              >
                {/* HEADER CONFIDENTIALITÉ */}
                <div className="relative p-6 border-b border-teal-200/30 dark:border-teal-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Paramètres de confidentialité</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Contrôlez qui peut voir vos informations</p>
                    </div>
                  </div>
                </div>

                {/* CONTENU CONFIDENTIALITÉ */}
                <div className="p-6 space-y-6">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-teal-200/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Visibilité du profil</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Qui peut voir votre profil</p>
                      </div>
                    </div>
                    <select
                      value={currentPrivacySettings.profile_visibility}
                      onChange={(e) => {
                        const newValue = e.target.value as 'public' | 'friends' | 'private';
                        savePrivacySettings({
                          ...currentPrivacySettings,
                          profile_visibility: newValue
                        });
                      }}
                      className="px-4 py-2 bg-white/90 dark:bg-gray-800/90 border border-teal-200/50 rounded-lg text-sm font-medium"
                    >
                      <option value="public">🌍 Public</option>
                      <option value="friends">👥 Amis uniquement</option>
                      <option value="private">🔒 Privé</option>
                    </select>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-teal-200/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Statut en ligne</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Montrer quand vous êtes en ligne</p>
                      </div>
                    </div>
                    <Switch
                      checked={currentPrivacySettings.show_online_status}
                      onCheckedChange={(checked) => savePrivacySettings({
                        ...currentPrivacySettings,
                        show_online_status: checked
                      })}
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-teal-200/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Demandes d'amis</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Autoriser les demandes d'amis</p>
                      </div>
                    </div>
                    <Switch
                      checked={currentPrivacySettings.allow_messages_from === 'public'}
                      onCheckedChange={(checked) => savePrivacySettings({
                        ...currentPrivacySettings,
                        allow_messages_from: checked ? 'public' : 'private'
                      })}
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-teal-200/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Adresse email</Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Montrer votre email aux autres</p>
                      </div>
                    </div>
                    <Switch
                      checked={currentPrivacySettings.show_email}
                      onCheckedChange={(checked) => savePrivacySettings({
                        ...currentPrivacySettings,
                        show_email: checked
                      })}
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => savePrivacySettings(currentPrivacySettings)}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                    >
                      <Shield className="w-5 h-5 mr-2" />
                      {isLoading ? 'Sauvegarde...' : '🔒 Sauvegarder la confidentialité'}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ONGLET NOTIFICATIONS ULTRA-MODERNE */}
            <TabsContent value="notifications">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/95 via-cyan-50/80 to-white/95 dark:from-gray-800/95 dark:via-cyan-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-cyan-200/50 dark:border-cyan-800/50 overflow-hidden"
              >
                {/* HEADER NOTIFICATIONS */}
                <div className="relative p-6 border-b border-cyan-200/30 dark:border-cyan-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Préférences de notifications</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Choisissez comment vous souhaitez être notifié</p>
                    </div>
                  </div>
                </div>

                {/* CONTENU NOTIFICATIONS */}
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyan-500" />
                      Méthodes de notification
                    </h4>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-cyan-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notifications push</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Dans le navigateur</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.pushNotifications}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          pushNotifications: checked
                        })}
                      />
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-cyan-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notifications par email</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Activités importantes</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.emailNotifications}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          emailNotifications: checked
                        })}
                      />
                    </motion.div>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-500" />
                      Types d'activités
                    </h4>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-purple-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Demandes d'amis</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Nouvelles demandes</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.friendRequests}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          friendRequests: checked
                        })}
                      />
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-purple-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <MessagesSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Messages</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Nouveaux messages</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.messages}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          messages: checked
                        })}
                      />
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-purple-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">J'aime</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Réactions à vos posts</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.likes}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          likes: checked
                        })}
                      />
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-purple-200/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Commentaires</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Nouveaux commentaires</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentNotificationSettings.comments}
                        onCheckedChange={(checked) => saveNotificationSettings({
                          ...currentNotificationSettings,
                          comments: checked
                        })}
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => saveNotificationSettings(currentNotificationSettings)}
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                    >
                      <Bell className="w-5 h-5 mr-2" />
                      {isLoading ? 'Sauvegarde...' : '🔔 Sauvegarder les notifications'}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ONGLET SÉCURITÉ ULTRA-MODERNE */}
            <TabsContent value="security">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/95 via-purple-50/80 to-white/95 dark:from-gray-800/95 dark:via-purple-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 dark:border-purple-800/50 overflow-hidden"
              >
                {/* HEADER SÉCURITÉ */}
                <div className="relative p-6 border-b border-purple-200/30 dark:border-purple-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Sécurité du compte</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Protégez votre compte et vos données</p>
                    </div>
                  </div>
                </div>

                {/* CONTENU SÉCURITÉ */}
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Key className="w-5 h-5 text-purple-500" />
                      Changer le mot de passe
                    </h4>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Mot de passe actuel</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Votre mot de passe actuel"
                            className="h-12 border-purple-200/50 focus:border-purple-400 rounded-xl pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nouveau mot de passe</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Votre nouveau mot de passe"
                            className="h-12 border-purple-200/50 focus:border-purple-400 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Confirmer</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirmez le mot de passe"
                            className="h-12 border-purple-200/50 focus:border-purple-400 rounded-xl"
                          />
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={changePassword}
                          disabled={isLoading}
                          className="w-full h-12 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                        >
                          <Shield className="w-5 h-5 mr-2" />
                          {isLoading ? 'Changement...' : '🔐 Changer le mot de passe'}
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-indigo-500" />
                      Sessions actives
                    </h4>
                    <div className="p-4 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-700/80 dark:to-gray-600/80 rounded-xl border border-indigo-200/30">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Vous êtes actuellement connecté sur cet appareil. Votre session est sécurisée.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Session active et sécurisée</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full h-12 border-2 border-indigo-200/50 hover:border-indigo-400 rounded-xl">
                      📱 Voir toutes les sessions
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ONGLET COMPTE ULTRA-MODERNE */}
            <TabsContent value="account">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* SECTION DONNÉES */}
                <motion.div
                  className="bg-gradient-to-br from-white/95 via-indigo-50/80 to-white/95 dark:from-gray-800/95 dark:via-indigo-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200/50 dark:border-indigo-800/50 overflow-hidden"
                >
                  <div className="relative p-6 border-b border-indigo-200/30 dark:border-indigo-800/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Gestion des données</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Téléchargez vos données personnelles</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200/30">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Télécharger vos données</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Téléchargez une copie de toutes vos données personnelles au format JSON, incluant vos posts, amis et messages.
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={downloadData}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-12 border-2 border-blue-200/50 hover:border-blue-400 rounded-xl"
                          >
                            <Download className="w-5 h-5 mr-2" />
                            {isLoading ? 'Téléchargement...' : '📥 Télécharger mes données'}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ZONE DE DANGER */}
                <motion.div
                  className="bg-gradient-to-br from-red-50/80 via-pink-50/80 to-red-50/80 dark:from-red-950/20 dark:via-pink-950/20 dark:to-red-950/20 backdrop-blur-sm rounded-2xl shadow-xl border border-red-200/50 dark:border-red-800/50 overflow-hidden"
                >
                  <div className="relative p-6 border-b border-red-200/30 dark:border-red-800/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Zone de danger</h3>
                        <p className="text-sm text-red-500 dark:text-red-300">Actions irréversibles</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="p-4 bg-gradient-to-r from-red-50/90 to-pink-50/90 dark:from-red-950/30 dark:to-pink-950/30 rounded-xl border border-red-200/50">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Supprimer le compte</h4>
                          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                            Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement, incluant vos posts, amis, messages et profil.
                          </p>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-4"
                      >
                        <Button
                          onClick={deleteAccount}
                          disabled={isLoading}
                          variant="destructive"
                          className="w-full h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                        >
                          <Trash2 className="w-5 h-5 mr-2" />
                          {isLoading ? 'Suppression...' : '🗑️ Supprimer mon compte définitivement'}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
