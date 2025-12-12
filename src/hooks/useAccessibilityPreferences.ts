import { useState, useEffect } from 'react';

/**
 * Hook pour gérer les préférences d'accessibilité utilisateur
 * Support pour reduced-motion, prefers-contrast, et autres préférences
 */
export const useAccessibilityPreferences = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [prefersReducedTransparency, setPrefersReducedTransparency] = useState(false);

  useEffect(() => {
    // Détection des préférences utilisateur
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)')
    };

    // Fonction de mise à jour des états
    const updatePreferences = () => {
      setReducedMotion(mediaQueries.reducedMotion.matches);
      setPrefersHighContrast(mediaQueries.highContrast.matches);
      setPrefersReducedTransparency(mediaQueries.reducedTransparency.matches);
    };

    // Mise à jour initiale
    updatePreferences();

    // Écouteurs pour les changements
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences);
    });

    // Cleanup
    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  return {
    reducedMotion,
    prefersHighContrast,
    prefersReducedTransparency,
    // Classes CSS conditionnelles
    motionClass: reducedMotion ? 'motion-reduced' : 'motion-normal',
    contrastClass: prefersHighContrast ? 'contrast-high' : 'contrast-normal',
    transparencyClass: prefersReducedTransparency ? 'transparency-reduced' : 'transparency-normal'
  };
};
