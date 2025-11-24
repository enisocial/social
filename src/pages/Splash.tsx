import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Mark splash as viewed
    sessionStorage.setItem('splash_viewed', 'true');
    
    // Fonction de navigation immédiate
    const navigateAway = () => {
      if (!loading) {
        if (user) {
          navigate('/feed', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    };

    // Navigation après 3 secondes ou immédiate si déjà chargé
    const timer = setTimeout(() => {
      navigateAway();
    }, 3000);

    // Timeout de secours pour Android (max 5 secondes)
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback navigation triggered');
      navigateAway();
    }, 5000);

    // Navigation immédiate si déjà chargé après 1 seconde
    const quickTimer = setTimeout(() => {
      if (!loading) {
        navigateAway();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      clearTimeout(quickTimer);
    };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo with multiple animations */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary via-pink-500 to-orange-500 blur-2xl opacity-50 animate-[pulse_2s_ease-in-out_infinite]"></div>
          
          {/* Main logo circle */}
          <div className="relative w-32 h-32 rounded-full gradient-primary flex items-center justify-center animate-[scale-in_0.8s_ease-out,fade-in_0.8s_ease-out] shadow-2xl">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
            <span className="text-6xl font-bold text-white animate-[fade-in_1s_ease-out_0.3s_both]">
              S
            </span>
          </div>

          {/* Rotating ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
        </div>

        {/* App name with staggered animation */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold text-foreground animate-[fade-in_0.8s_ease-out_0.6s_both]">
            Social
          </h1>
          <p className="text-muted-foreground animate-[fade-in_0.8s_ease-out_0.9s_both]">
            Connectez-vous avec le monde
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 animate-[fade-in_0.8s_ease-out_1.2s_both]">
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Footer branding */}
        <div className="mt-12 animate-[fade-in_0.8s_ease-out_1.5s_both]">
          <p className="text-sm text-muted-foreground">by AFRINEX TECH</p>
        </div>
      </div>
    </div>
  );
};

export default Splash;
