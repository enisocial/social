import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ProfileCompletionBannerProps {
  userId: string;
}

export const ProfileCompletionBanner = ({ userId }: ProfileCompletionBannerProps) => {
  const { completeness, loading } = useProfileCompleteness(userId);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('profile-banner-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('profile-banner-dismissed', 'true');
  };

  if (loading || !completeness || completeness.score === 100 || dismissed) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            {completeness.score >= 70 ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <h3 className="font-semibold text-lg">
              Complétez votre profil
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Votre profil est complet à {completeness.score}%
              </span>
              <span className="font-medium">{completeness.score}%</span>
            </div>
            <Progress value={completeness.score} className="h-2" />
          </div>

          {completeness.missingFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Informations manquantes :
              </p>
              <div className="flex flex-wrap gap-2">
                {completeness.missingFields.slice(0, 5).map((field) => (
                  <span
                    key={field}
                    className="px-3 py-1 bg-background rounded-full text-xs border border-border"
                  >
                    {field}
                  </span>
                ))}
                {completeness.missingFields.length > 5 && (
                  <span className="px-3 py-1 bg-background rounded-full text-xs border border-border">
                    +{completeness.missingFields.length - 5} autres
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button asChild size="sm">
              <Link to="/settings">Compléter mon profil</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Plus tard
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
