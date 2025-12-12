import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, MessageSquare, Heart, UserPlus, ShoppingBag } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationSettings() {
  const { user } = useAuth();
  const { permission, isSubscribed, isSupported, requestPermission, unsubscribe } = usePushNotifications(user?.id);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Paramètres des notifications</h1>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="w-6 h-6 text-primary" />
              ) : (
                <BellOff className="w-6 h-6 text-muted-foreground" />
              )}
              <div>
                <h2 className="font-semibold">Notifications Push</h2>
                <p className="text-sm text-muted-foreground">
                  {!isSupported && "Non supporté sur ce navigateur"}
                  {isSupported && permission === 'denied' && "Permission refusée"}
                  {isSupported && permission === 'granted' && isSubscribed && "Activées"}
                  {isSupported && permission === 'default' && "Non configurées"}
                </p>
              </div>
            </div>
            
            {isSupported && permission !== 'denied' && (
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggle}
              />
            )}
          </div>

          {!isSupported && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                Les notifications push ne sont pas supportées sur ce navigateur. 
                Essayez Chrome, Firefox ou Safari pour profiter de cette fonctionnalité.
              </p>
            </div>
          )}

          {isSupported && permission === 'denied' && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm">
                Vous avez refusé les notifications. Pour les activer, vous devez modifier les permissions 
                de votre navigateur dans les paramètres.
              </p>
            </div>
          )}

          {isSupported && permission === 'default' && (
            <div className="mt-4">
              <Button onClick={requestPermission} className="w-full">
                Activer les notifications
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Types de notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <Label htmlFor="messages" className="cursor-pointer">
                  Nouveaux messages
                </Label>
              </div>
              <Switch id="messages" checked={isSubscribed} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-primary" />
                <Label htmlFor="likes" className="cursor-pointer">
                  Likes sur vos publications
                </Label>
              </div>
              <Switch id="likes" checked={isSubscribed} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <Label htmlFor="comments" className="cursor-pointer">
                  Commentaires
                </Label>
              </div>
              <Switch id="comments" checked={isSubscribed} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-primary" />
                <Label htmlFor="friends" className="cursor-pointer">
                  Demandes d'ami
                </Label>
              </div>
              <Switch id="friends" checked={isSubscribed} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <Label htmlFor="marketplace" className="cursor-pointer">
                  Commandes marketplace
                </Label>
              </div>
              <Switch id="marketplace" checked={isSubscribed} disabled />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            * Les préférences de notification détaillées seront bientôt disponibles
          </p>
        </Card>
      </main>
    </div>
  );
}
