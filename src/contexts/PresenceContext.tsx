import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { presenceService } from '@/services/PresenceService';

interface PresenceContextType {
  isOnline: boolean;
  updatePresence: (online: boolean) => Promise<void>;
  isUserOnline: (userId: string) => Promise<boolean>;
  getLastSeen: (userId: string) => Promise<string | null>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    // Fallback sécurisé
    return {
      isOnline: false,
      updatePresence: async () => {},
      isUserOnline: () => false,
      getLastSeen: () => null
    };
  }
  return context;
};

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  // Fonction de mise à jour sécurisée
  const updatePresence = async (online: boolean) => {
    await presenceService.updatePresence(online);
    setIsOnline(online);
  };

  // Initialisation au montage - très simple
  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(() => {
        presenceService.initialize(user.id);
        setIsOnline(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  // Nettoyage à la fermeture
  useEffect(() => {
    const handleBeforeUnload = () => {
      presenceService.cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const value = {
    isOnline,
    updatePresence,
    isUserOnline: presenceService.isUserOnline,
    getLastSeen: presenceService.getLastSeen
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};
