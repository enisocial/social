import React, { createContext, useContext, useState } from 'react';

interface SimpleMessengerContextType {
  // Version simplifiée sans hooks complexes
  conversations: Map<string, any>;
  openBubble: (conversationId: string | null, otherUser: any) => void;
  closeBubble: (conversationId: string) => void;
}

const SimpleMessengerContext = createContext<SimpleMessengerContextType | null>(null);

export const useSimpleMessenger = () => {
  const context = useContext(SimpleMessengerContext);
  if (!context) {
    // Return default implementation to prevent crashes
    return {
      conversations: new Map(),
      openBubble: () => {},
      closeBubble: () => {},
    };
  }
  return context;
};

export const SimpleMessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Map<string, any>>(new Map());

  // Version simplifiée sans useConversations hook
  const openBubble = (conversationId: string | null, otherUser: any) => {
    if (!conversationId || !otherUser) return;

    setConversations(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, {
        id: conversationId,
        otherUser,
        isOpen: true
      });
      return newMap;
    });
  };

  const closeBubble = (conversationId: string) => {
    setConversations(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  };

  const value = {
    conversations,
    openBubble,
    closeBubble
  };

  return (
    <SimpleMessengerContext.Provider value={value}>
      {children}
    </SimpleMessengerContext.Provider>
  );
};
