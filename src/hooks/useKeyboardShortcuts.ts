import { useEffect, useCallback } from 'react';

/**
 * Hook pour gérer les raccourcis clavier dans l'application
 * Support pour les raccourcis d'accessibilité et navigation
 */
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Vérifier les modificateurs
    const isCtrl = event.ctrlKey || event.metaKey; // Cmd sur Mac, Ctrl sur autres
    const isAlt = event.altKey;
    const isShift = event.shiftKey;

    // Construire la combinaison de touches
    let combo = '';
    if (isCtrl) combo += 'ctrl+';
    if (isAlt) combo += 'alt+';
    if (isShift) combo += 'shift+';
    combo += event.key.toLowerCase();

    // Vérifier si la combinaison existe dans les raccourcis
    if (shortcuts[combo]) {
      event.preventDefault();
      shortcuts[combo]();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Retourner les raccourcis disponibles pour l'affichage
  return {
    shortcuts: Object.keys(shortcuts),
    help: Object.entries(shortcuts).map(([combo, action]) => ({
      combo: combo.replace('ctrl+', '⌘').replace('alt+', '⌥').replace('shift+', '⇧'),
      description: getShortcutDescription(combo)
    }))
  };
};

// Fonction utilitaire pour obtenir la description des raccourcis
const getShortcutDescription = (combo: string): string => {
  const descriptions: Record<string, string> = {
    'ctrl+f': 'Rechercher des salles',
    'ctrl+/': 'Afficher l\'aide des raccourcis',
    'ctrl+1': 'Aller aux salles actives',
    'ctrl+2': 'Aller à mes salles',
    'ctrl+m': 'Activer/désactiver le micro',
    'ctrl+h': 'Lever la main',
    'escape': 'Fermer les modals / Annuler',
    'tab': 'Naviguer entre les éléments',
    'shift+tab': 'Naviguer en arrière',
    'enter': 'Activer l\'élément sélectionné',
    'space': 'Activer l\'élément (boutons)',
    'arrowup': 'Naviguer vers le haut',
    'arrowdown': 'Naviguer vers le bas',
    'arrowleft': 'Naviguer vers la gauche',
    'arrowright': 'Naviguer vers la droite'
  };

  return descriptions[combo] || `Raccourci ${combo}`;
};
