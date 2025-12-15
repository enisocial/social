import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Mark splash as viewed
    sessionStorage.setItem('splash_viewed', 'true');

    // Fonction de navigation
    const navigateAway = () => {
      if (!loading) {
        if (user) {
          navigate('/feed', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    };

    // Animation complète après 4 secondes
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 4000);

    // Navigation après 8 secondes minimum pour laisser le temps de lire
    const timer = setTimeout(() => {
      navigateAway();
    }, 8000);

    // Timeout de secours pour les appareils mobiles (max 12 secondes)
    const fallbackTimer = setTimeout(() => {
      navigateAway();
    }, 12000);

    // SUPPRIMÉ: Navigation immédiate trop agressive
    // L'utilisateur doit avoir le temps de lire le contenu

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      clearTimeout(animationTimer);
    };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Simple animated background */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/10 rounded-full blur-3xl splash-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-cyan-400/10 rounded-full blur-3xl splash-float-reverse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1">
        {/* Grand "S" au centre */}
        <div className="mb-8">
          <span className="text-9xl md:text-[12rem] font-black bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-transparent splash-bounce">
            S
          </span>
        </div>

        {/* Nom de l'application animé */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-wider text-white splash-fade-in">
            <span className="inline-block splash-letter-s">s</span>
            <span className="inline-block splash-letter-o">o</span>
            <span className="inline-block splash-letter-c">c</span>
            <span className="inline-block splash-letter-i">i</span>
            <span className="inline-block splash-letter-a">a</span>
            <span className="inline-block splash-letter-l">l</span>
          </h1>

          {/* Ligne animée sous le texte */}
          <div className="mt-6 mx-auto w-48 h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 rounded-full splash-grow-line"></div>
        </div>
      </div>

      {/* Footer avec "by Afrinex-tech" en petit */}
      <div className="relative z-10 pb-12 splash-footer-fade">
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          by Afrinex-tech
        </p>
      </div>
    </div>
  );
};

export default Splash;
