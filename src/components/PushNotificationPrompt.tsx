import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationPromptProps {
  userId?: string;
}

export const PushNotificationPrompt = ({ userId }: PushNotificationPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { permission, isSupported, requestPermission } = usePushNotifications(userId);

  useEffect(() => {
    // Show prompt after 10 seconds if not already granted or denied
    const timer = setTimeout(() => {
      if (isSupported && permission === 'default' && userId) {
        const dismissed = localStorage.getItem('push-notification-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }
    }, 10000); // 10 seconds delay

    return () => clearTimeout(timer);
  }, [isSupported, permission, userId]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push-notification-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4">
      <Card className="p-4 shadow-xl border-2">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Restez informé !</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Activez les notifications pour être averti des nouveaux messages, likes et commentaires.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={handleEnable} size="sm" className="flex-1">
                Activer
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                Plus tard
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
