import React from 'react';

// Provider vide pour compatibilité - la logique est maintenant dans useBadgeSync
export const BadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
