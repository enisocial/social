import { useCallback } from 'react';

/**
 * Hook utilitaire pour annoncer des messages aux lecteurs d'écran
 * Compatible avec WCAG 2.1 - Accessibilité
 */
export const useScreenReader = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Créer ou récupérer l'élément d'annonce
    let announcementElement = document.getElementById('screen-reader-announcements');

    if (!announcementElement) {
      announcementElement = document.createElement('div');
      announcementElement.id = 'screen-reader-announcements';
      announcementElement.setAttribute('aria-live', priority);
      announcementElement.setAttribute('aria-atomic', 'true');
      announcementElement.style.position = 'absolute';
      announcementElement.style.left = '-10000px';
      announcementElement.style.width = '1px';
      announcementElement.style.height = '1px';
      announcementElement.style.overflow = 'hidden';
      document.body.appendChild(announcementElement);
    }

    // Mettre à jour l'attribut aria-live si nécessaire
    if (announcementElement.getAttribute('aria-live') !== priority) {
      announcementElement.setAttribute('aria-live', priority);
    }

    // Annoncer le message
    announcementElement.textContent = message;

    // Nettoyer après un délai
    setTimeout(() => {
      announcementElement!.textContent = '';
    }, 1000);
  }, []);

  const announcePolite = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  const announceAssertive = useCallback((message: string) => {
    announce(message, 'assertive');
  }, [announce]);

  return {
    announce,
    announcePolite,
    announceAssertive
  };
};
