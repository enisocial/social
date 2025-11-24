import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// WonderPush Web SDK Key
const WONDERPUSH_WEB_KEY = import.meta.env.VITE_WONDERPUSH_WEB_KEY || '';

declare global {
  interface Window {
    WonderPush: any;
  }
}

export const usePushNotifications = (userId?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Initialize WonderPush
    const initWonderPush = () => {
      if (!WONDERPUSH_WEB_KEY) {
        console.warn('WonderPush Web Key not configured');
        return;
      }

      // Load WonderPush SDK
      window.WonderPush = window.WonderPush || [];
      window.WonderPush.push(['init', {
        webKey: WONDERPUSH_WEB_KEY,
        userId: userId,
      }]);

      // Check if supported
      window.WonderPush.push(function() {
        setIsSupported(true);
        setPermission(Notification.permission);
        
        // Check subscription status
        window.WonderPush.push(function() {
          const subscriptionState = window.WonderPush.getSubscriptionState();
          setIsSubscribed(subscriptionState === 'subscribed');
        });
      });
    };

    // Load WonderPush script
    if (!document.getElementById('wonderpush-sdk')) {
      const script = document.createElement('script');
      script.id = 'wonderpush-sdk';
      script.src = 'https://cdn.by.wonderpush.com/sdk/1.1/wonderpush-loader.min.js';
      script.async = true;
      script.onload = initWonderPush;
      document.head.appendChild(script);
    } else {
      initWonderPush();
    }
  }, [userId]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Les notifications push ne sont pas supportées sur ce navigateur');
      return false;
    }

    try {
      await subscribe();
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erreur lors de la demande de permission');
      return false;
    }
  };

  const subscribe = async () => {
    if (!userId) {
      toast.error('Vous devez être connecté pour activer les notifications');
      return;
    }

    try {
      // Subscribe via WonderPush
      window.WonderPush.push(['subscribeToNotifications']);

      // Wait for subscription
      window.WonderPush.push(function() {
        const subscriptionState = window.WonderPush.getSubscriptionState();
        if (subscriptionState === 'subscribed') {
          // Get installation ID
          const installationId = window.WonderPush.getInstallationId();
          
          // Save to database
          supabase
            .from('push_subscriptions')
            .upsert({
              user_id: userId,
              endpoint: installationId,
              p256dh: '',
              auth: '',
            })
            .then(({ error }) => {
              if (error) {
                console.error('Error saving subscription:', error);
              } else {
                setIsSubscribed(true);
                setPermission('granted');
                toast.success('Notifications activées avec succès !');
              }
            });
        }
      });
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    }
  };

  const unsubscribe = async () => {
    try {
      // Unsubscribe via WonderPush
      window.WonderPush.push(['unsubscribeFromNotifications']);

      // Remove from database
      if (userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }

      setIsSubscribed(false);
      toast.success('Notifications désactivées');
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Erreur lors de la désactivation des notifications');
    }
  };

  return {
    permission,
    isSubscribed,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
  };
};
