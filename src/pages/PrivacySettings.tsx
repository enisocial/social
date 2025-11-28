import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FacebookFeedLayout } from '@/components/feed/FacebookFeedLayout';
import {
  Shield, Eye, Users, MapPin, Search, MessageSquare, Bell,
  Lock, Globe, UserCheck, Settings, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  allow_messages_from: 'public' | 'friends' | 'private';
  show_online_status: boolean;
  show_email: boolean;
  show_birthdate: boolean;
  search_visibility: boolean;
}

const PrivacySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'friends',
    allow_messages_from: 'friends',
    show_online_status: true,
    show_email: false,
    show_birthdate: false,
    search_visibility: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  const loadPrivacySettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        // Map account_settings fields to our PrivacySettings interface
        setSettings({
          profile_visibility: data.profile_visibility || 'friends',
          allow_messages_from: data.allow_messages_from || 'friends',
          show_online_status: data.show_online_status !== false, // default true
          show_email: data.show_email || false,
          show_birthdate: data.show_birthdate || false,
          search_visibility: true // default to true since field doesn't exist
        });
      }
    } catch (error) {
      console.error('Erreur chargement paramètres confidentialité:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      console.log('Sauvegarde des paramètres:', settings);

      // D'abord essayer de voir si une entrée existe
      const { data: existing, error: selectError } = await supabase
        .from('account_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Données existantes:', existing, selectError);

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification des données existantes:', selectError);
        throw selectError;
      }

      const upsertData = {
        user_id: user.id,
        profile_visibility: settings.profile_visibility,
        allow_messages_from: settings.allow_messages_from,
        show_online_status: settings.show_online_status,
        show_email: settings.show_email,
        show_birthdate: settings.show_birthdate
      };

      console.log('Données à sauvegarder:', upsertData);

      const { data, error } = await supabase
        .from('account_settings')
        .upsert(upsertData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Erreur upsert:', error);
        throw error;
      }

      console.log('Sauvegarde réussie:', data);
      toast.success('Paramètres de confidentialité sauvegardés avec succès');

      // Recharger les paramètres après sauvegarde
      await loadPrivacySettings();

    } catch (error: any) {
      console.error('Erreur sauvegarde paramètres:', error);
      toast.error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <FacebookFeedLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Chargement des paramètres...</p>
          </div>
        </div>
      </FacebookFeedLayout>
    );
  }

  return (
    <FacebookFeedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Paramètres de confidentialité
          </h1>
          <p className="text-muted-foreground mt-2">
            Contrôlez qui peut voir vos informations et interagir avec vous
          </p>
        </div>

        {/* Profile Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visibilité du profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Qui peut voir mon profil ?</Label>
                <p className="text-sm text-muted-foreground">
                  Contrôle qui peut consulter votre page de profil
                </p>
              </div>
              <Select
                value={settings.profile_visibility}
                onValueChange={(value: 'public' | 'friends' | 'private') =>
                  updateSetting('profile_visibility', value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Public</SelectItem>
                  <SelectItem value="friends">👥 Amis</SelectItem>
                  <SelectItem value="private">🔒 Privé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Interaction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contacts et interactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Messages de qui accepter ?</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser les messages de personnes selon leur relation avec vous
                </p>
              </div>
              <Select
                value={settings.allow_messages_from}
                onValueChange={(value: 'public' | 'friends' | 'private') =>
                  updateSetting('allow_messages_from', value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Tout le monde</SelectItem>
                  <SelectItem value="friends">👥 Amis seulement</SelectItem>
                  <SelectItem value="private">🔒 Personne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Montrer mon statut en ligne</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux autres de voir quand vous êtes actif
                </p>
              </div>
              <Switch
                checked={settings.show_online_status}
                onCheckedChange={(checked) => updateSetting('show_online_status', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Information Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Informations affichées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Afficher mon email</Label>
                <p className="text-sm text-muted-foreground">
                  Montrer votre adresse email sur votre profil
                </p>
              </div>
              <Switch
                checked={settings.show_email}
                onCheckedChange={(checked) => updateSetting('show_email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Afficher ma date de naissance</Label>
                <p className="text-sm text-muted-foreground">
                  Montrer votre date de naissance sur votre profil
                </p>
              </div>
              <Switch
                checked={settings.show_birthdate}
                onCheckedChange={(checked) => updateSetting('show_birthdate', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Apparaître dans les recherches</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux autres de vous trouver via la recherche
                </p>
              </div>
              <Switch
                checked={settings.search_visibility}
                onCheckedChange={(checked) => updateSetting('search_visibility', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <Button onClick={savePrivacySettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>💡 Astuce : Vous pouvez modifier ces paramètres à tout moment</p>
          <p className="mt-1">🔒 Vos paramètres de confidentialité sont toujours respectés</p>
        </div>
      </div>
    </FacebookFeedLayout>
  );
};

export default PrivacySettings;
