import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Sparkles, TrendingUp, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileCompletenessBannerProps {
  userId: string;
}

export const ProfileCompletenessBanner = ({ userId }: ProfileCompletenessBannerProps) => {
  const { completeness, loading, refresh } = useProfileCompleteness(userId);

  // DEBUG: Log pour voir si la bannière se rend
  console.log('🎯 BANNER RENDER:', { completeness, loading, score: completeness?.score });

  // IMPORTANT: Ne montrer AUCUNE bannière pendant le chargement initial
  // Cela évite le flash quand on revient sur un profil complet
  if (loading) {
    console.log('🎯 BANNER HIDDEN: Loading state');
    return null;
  }

  // Masquer définitivement la bannière si le profil est complet
  if (completeness && completeness.score >= 100) {
    console.log('🎯 BANNER HIDDEN: Profile complete (100%)');
    return null;
  }

  // Masquer si pas de données de complétude
  if (!completeness) {
    console.log('🎯 BANNER HIDDEN: No completeness data');
    return null;
  }

  // Seulement maintenant afficher la bannière si elle doit être visible

  const getGradientColors = (score: number) => {
    if (score >= 80) return 'from-green-50 to-emerald-50 border-green-200';
    if (score >= 60) return 'from-yellow-50 to-orange-50 border-yellow-200';
    return 'from-blue-50 to-purple-50 border-blue-200';
  };

  const getIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-6 w-6 text-green-600" />;
    return <TrendingUp className="h-6 w-6 text-blue-600" />;
  };

  const getTitle = (score: number) => {
    if (score >= 80) return 'Presque terminé !';
    if (score >= 60) return 'Vous progressez bien !';
    return 'Améliorez votre profil';
  };

  const getDescription = (score: number) => {
    if (score >= 80) return 'Quelques informations suffisent pour compléter votre profil.';
    if (score >= 60) return 'Continuez à remplir vos informations pour être plus visible.';
    return 'Un profil complet attire plus d\'attention et d\'interactions.';
  };

  const nextSteps = completeness.missingFields.slice(0, 2);

  return (
    <Card className={`p-6 mb-6 bg-gradient-to-r ${getGradientColors(completeness.score)} border-2 shadow-xl backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-shrink-0">
            {getIcon(completeness.score)}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {getTitle(completeness.score)}
            </h3>
            <p className="text-gray-700 mb-3 text-sm">
              {getDescription(completeness.score)}
            </p>

            <div className="flex items-center gap-3 mb-2">
              <Progress
                value={completeness.score}
                className="flex-1 h-3 bg-white/50"
              />
              <span className="text-lg font-bold text-gray-900 min-w-[3rem] text-right">
                {completeness.score}%
              </span>
            </div>

            {nextSteps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextSteps.map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full text-xs font-medium text-gray-700"
                  >
                    <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ml-6 flex-shrink-0">
          <Link to="/complete-profile">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-50 shadow-md border-0 px-6 py-3 h-auto font-semibold"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Compléter mon profil
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
