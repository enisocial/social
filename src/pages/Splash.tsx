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

    // Timeout de secours pour Android (max 12 secondes)
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback navigation triggered');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* African-inspired background patterns */}
      <div className="absolute inset-0 opacity-[0.03]">
        {/* Geometric patterns */}
        <div className="absolute top-20 left-20 w-96 h-96 border-4 border-amber-400 rounded-full"></div>
        <div className="absolute top-40 right-32 w-64 h-64 border-4 border-orange-400 transform rotate-45"></div>
        <div className="absolute bottom-32 left-40 w-80 h-80 border-4 border-yellow-400 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 border-4 border-amber-500 transform rotate-12"></div>

        {/* Additional concentric circles */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-amber-300 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-orange-300 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-yellow-300 rounded-full"></div>
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-400/20 via-orange-400/15 to-yellow-400/10 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 via-purple-400/10 to-pink-400/5 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite_reverse]" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-green-400/10 to-teal-400/5 rounded-full blur-2xl animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Logo section */}
        <div className="text-center mb-16">
          {/* Animated logo */}
          <div className="relative mb-8">
            {/* Outer glow rings */}
            <div className="absolute inset-0 w-40 h-40 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 blur-3xl opacity-30 animate-[pulse_3s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-400 blur-2xl opacity-50 animate-[pulse_2s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}></div>

            {/* Main logo */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <img
                    src="/icon-192.png"
                    alt="Logo"
                    className="w-10 h-10 animate-[bounce_2s_ease-in-out_infinite]"
                  />
                </div>
              </div>

              {/* Rotating accent rings */}
              <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-amber-400/50 animate-[spin_8s_linear_infinite]"></div>
              <div className="absolute inset-2 w-28 h-28 rounded-full border border-orange-400/30 animate-[spin_6s_linear_infinite_reverse]"></div>
            </div>
          </div>

          {/* Animated "social" text - letter by letter */}
          <div className="mb-6">
            <h1 className="text-6xl md:text-7xl font-black tracking-wider text-white">
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_0.2s_both] opacity-0 [animation-fill-mode:forwards]">s</span>
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_0.4s_both] opacity-0 [animation-fill-mode:forwards]">o</span>
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_0.6s_both] opacity-0 [animation-fill-mode:forwards]">c</span>
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_0.8s_both] opacity-0 [animation-fill-mode:forwards]">i</span>
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_1s_both] opacity-0 [animation-fill-mode:forwards]">a</span>
              <span className="inline-block animate-[letter-appear_0.8s_ease-out_1.2s_both] opacity-0 [animation-fill-mode:forwards]">l</span>
            </h1>

            {/* Animated underline */}
            <div className="mt-4 mx-auto w-32 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 rounded-full animate-[grow-width_1.5s_ease-out_1.5s_both] origin-left"></div>
          </div>

          {/* Subtitle with African theme */}
          <div className="space-y-4">
            <p className="text-xl md:text-2xl text-slate-300 font-medium animate-[fade-in_1s_ease-out_1.8s_both] opacity-0 [animation-fill-mode:forwards]">
              Connectez-vous avec <span className="text-amber-400 font-bold">l'Afrique</span>
            </p>
            <p className="text-slate-400 text-lg animate-[fade-in_1s_ease-out_2.2s_both] opacity-0 [animation-fill-mode:forwards] max-w-2xl mx-auto leading-relaxed">
              Rejoignez la communauté panafricaine où vous pouvez partager vos histoires, découvrir de nouvelles cultures et rester connecté avec votre continent.
            </p>
          </div>

          {/* African-inspired feature highlights */}
          <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl mx-auto">
            <div className="text-center animate-[fade-in_1s_ease-out_2.6s_both] opacity-0 [animation-fill-mode:forwards]">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
              </div>
              <p className="text-sm font-semibold text-white">Communauté</p>
            </div>
            <div className="text-center animate-[fade-in_1s_ease-out_2.8s_both] opacity-0 [animation-fill-mode:forwards]">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
              </div>
              <p className="text-sm font-semibold text-white">Culture</p>
            </div>
            <div className="text-center animate-[fade-in_1s_ease-out_3s_both] opacity-0 [animation-fill-mode:forwards]">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
              </div>
              <p className="text-sm font-semibold text-white">Connexion</p>
            </div>
          </div>
        </div>

        {/* Loading progress bar */}
        <div className="w-full max-w-md animate-[fade-in_1s_ease-out_3.5s_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-[progress_4s_ease-out_forwards]"></div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-4">Préparation de votre expérience africaine...</p>
        </div>

        {/* Footer branding */}
        <div className="mt-16 animate-[fade-in_1s_ease-out_4s_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-500 text-sm">Propulsé par</p>
            <p className="text-amber-400 font-bold text-lg tracking-wider">AFRINEX TECH</p>
            <div className="flex gap-1 mt-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
