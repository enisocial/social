import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PlatformSettings = () => {
  const { settings, isLoading, updateSetting, createSetting, deleteSetting } = usePlatformSettings();
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    category: 'general',
    description: '',
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement des paramètres...</div>;
  }

  const categories = [...new Set(settings?.map(s => s.category) || [])];
  if (categories.length === 0) categories.push('general');

  const getSettingsByCategory = (category: string) => {
    return settings?.filter(s => s.category === category) || [];
  };

  const handleSave = (key: string) => {
    const value = editingValues[key];
    if (value !== undefined) {
      updateSetting.mutate({ key, value });
      setEditingValues(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const handleChange = (key: string, value: any) => {
    setEditingValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateSetting = () => {
    if (newSetting.key && newSetting.value) {
      createSetting.mutate({
        key: newSetting.key,
        value: newSetting.value,
        category: newSetting.category,
        description: newSetting.description || undefined,
      });
      setNewSetting({
        key: '',
        value: '',
        category: 'general',
        description: '',
      });
    }
  };

  const renderSettingInput = (setting: any) => {
    const currentValue = editingValues[setting.key] !== undefined 
      ? editingValues[setting.key] 
      : setting.value;

    if (typeof setting.value === 'boolean') {
      return (
        <Switch
          checked={currentValue}
          onCheckedChange={(checked) => handleChange(setting.key, checked)}
        />
      );
    }

    if (typeof setting.value === 'number') {
      return (
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => handleChange(setting.key, Number(e.target.value))}
          className="max-w-xs"
        />
      );
    }

    if (typeof setting.value === 'string' && setting.value.length > 100) {
      return (
        <Textarea
          value={currentValue}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          rows={3}
        />
      );
    }

    return (
      <Input
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(setting.key, e.target.value)}
        className="max-w-md"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Paramètres de la plateforme
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les paramètres globaux de l'application
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau paramètre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau paramètre</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau paramètre de configuration pour la plateforme
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Clé</Label>
                <Input
                  placeholder="ex: max_upload_size"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input
                  placeholder="ex: 5000000"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={newSetting.category}
                  onValueChange={(value) => setNewSetting(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="new">Nouvelle catégorie...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Description du paramètre"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreateSetting} className="w-full">
                Créer le paramètre
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList>
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            {getSettingsByCategory(category).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    Aucun paramètre dans cette catégorie
                  </p>
                </CardContent>
              </Card>
            ) : (
              getSettingsByCategory(category).map(setting => (
                <Card key={setting.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-medium">
                          {setting.key}
                        </CardTitle>
                        {setting.description && (
                          <CardDescription>{setting.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSetting.mutate(setting.key)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          {renderSettingInput(setting)}
                        </div>
                        {editingValues[setting.key] !== undefined && (
                          <Button
                            onClick={() => handleSave(setting.key)}
                            size="sm"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                        )}
                      </div>
                      {setting.updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Dernière modification: {new Date(setting.updated_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">💡 Conseils d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Les paramètres sont stockés de manière sécurisée dans la base de données</p>
          <p>• Utilisez des clés descriptives en snake_case (ex: max_upload_size)</p>
          <p>• Les valeurs booléennes utilisent des switches pour faciliter l'édition</p>
          <p>• Toutes les modifications sont auditées avec horodatage</p>
        </CardContent>
      </Card>
    </div>
  );
};
