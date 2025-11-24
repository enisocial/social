import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Check, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-xl">
            <Smartphone className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Installer Social</h1>
          <p className="text-muted-foreground">
            Installez l'application sur votre appareil pour une meilleure expérience
          </p>
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Application installée !</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Vous pouvez maintenant utiliser Social directement depuis votre écran d'accueil
            </p>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstallClick}
            size="lg"
            className="w-full gap-2"
          >
            <Download className="w-5 h-5" />
            Installer l'application
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Pour installer cette application :
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-bold">iPhone :</span>
                <span className="text-muted-foreground">
                  Appuyez sur <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">Android :</span>
                <span className="text-muted-foreground">
                  Ouvrez le menu du navigateur et sélectionnez <strong>Installer l'application</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Avantages de l'installation :</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-primary" />
              <span>Accès rapide depuis votre écran d'accueil</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-primary" />
              <span>Fonctionne hors ligne</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-primary" />
              <span>Expérience plein écran</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-primary" />
              <span>Chargement ultra rapide</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
