import React, { createContext, useContext, useState, useCallback } from 'react';
import { FacebookMessenger } from '@/components/messenger/FacebookMessenger';
import { useConversations } from '@/hooks/useConversations';

interface ConversationData {
  id: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  isOpen: boolean;
}

interface MessengerContextType {
  conversations: Map<string, ConversationData>;
  openBubble: (conversationId: string | null, otherUser: any) => void;
  closeBubble: (conversationId: string) => void;
  toggleBubble: (conversationId: string, otherUser: any) => void;
}

const MessengerContext = createContext<MessengerContextType | null>(null);

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    // Return default implementation to prevent crashes
    return {
      conversations: new Map(),
      openBubble: () => {},
      closeBubble: () => {},
      toggleBubble: () => {},
    };
  }
  return context;
};

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Map<string, ConversationData>>(new Map());
  const { createConversation } = useConversations();

  // Créer ou trouver une conversation
  const findOrCreateConversation = useCallback(async (otherUserId: string, otherUserData: any) => {
    console.log('🔍 [MESSENGER] Création/récupération conversation avec:', otherUserId);

    try {
      const conversationId = await createConversation(otherUserId);

      if (!conversationId) {
        throw new Error('Impossible de créer/récupérer la conversation');
      }

      console.log('✅ [MESSENGER] Conversation créée/récupérée:', conversationId);
      return conversationId;

    } catch (error) {
      console.error('❌ [MESSENGER] Erreur création conversation:', error);
      throw error;
    }
  }, [createConversation]);

  // Ouvrir une conversation dans une chatbubble
  const openBubble = useCallback(async (conversationId: string | null, otherUser: any) => {
    console.log('🚀 [MESSENGER] Opening chat bubble:', { conversationId, otherUser });

    // Si on a déjà un ID valide, ouvrir directement
    if (conversationId && !conversationId.startsWith('temp_')) {
      console.log('✅ [MESSENGER] ID valide, ouverture directe:', conversationId);
      setConversations(prev => {
        const existing = prev.get(conversationId);
        if (existing) {
          console.log('🔄 [MESSENGER] Chat déjà ouvert:', conversationId);
          return new Map(prev).set(conversationId, { ...existing, isOpen: true });
        } else {
          console.log('🆕 [MESSENGER] Nouvelle conversation:', conversationId);
          return new Map(prev).set(conversationId, {
            id: conversationId,
            otherUser: {
              id: otherUser.id,
              name: otherUser.name,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url
            },
            isOpen: true
          });
        }
      });
      return;
    }

    // Cas nouveau chat: créer temporairement puis résoudre
    const tempId = `temp_${Date.now()}_${otherUser.id}`;
    console.log('⚡ [MESSENGER] Création temporaire:', tempId);

    setConversations(prev => new Map(prev).set(tempId, {
      id: tempId,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username,
        avatar_url: otherUser.avatar_url
      },
      isOpen: true
    }));

    // Résoudre la conversation immédiatement
    if (otherUser?.id) {
      try {
        const finalId = await findOrCreateConversation(otherUser.id, otherUser);
        console.log('🎯 [MESSENGER] Résolution réussie:', finalId);

        setConversations(prev => {
          const tempData = prev.get(tempId);
          if (tempData) {
            console.log('🔄 [MESSENGER] Remplacement temp par réel');
            const newMap = new Map(prev);
            newMap.delete(tempId);
            newMap.set(finalId, {
              ...tempData,
              id: finalId
            });
            return newMap;
          }
          return prev;
        });

      } catch (error) {
        console.error('❌ [MESSENGER] Échec résolution:', error instanceof Error ? error.message : String(error));
        // Fermer la chatbubble après 3 secondes si échec
        setTimeout(() => {
          setConversations(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });
        }, 3000);
      }
    }

  }, [findOrCreateConversation]);

  // Fermer une conversation
  const closeBubble = useCallback((conversationId: string) => {
    console.log('❌ [MESSENGER] Fermeture conversation:', conversationId);
    setConversations(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  // Basculer ouverture/fermeture
  const toggleBubble = useCallback((conversationId: string, otherUser: any) => {
    setConversations(prev => {
      const existing = prev.get(conversationId);
      if (existing) {
        // Fermer si déjà ouverte
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      } else {
        // Ouvrir sinon
        return new Map(prev).set(conversationId, {
          id: conversationId,
          otherUser,
          isOpen: true
        });
      }
    });
  }, []);

  const value = {
    conversations,
    openBubble,
    closeBubble,
    toggleBubble
  };

  return (
    <MessengerContext.Provider value={value}>
      {children}

      {/* RENDRE LES CONVERSATIONS OUVERTES */}
      {Array.from(conversations.entries()).map(([convId, convData]) => (
        <FacebookMessenger
          key={convId}
          conversationId={convId}
          otherUser={convData.otherUser}
          isOpen={convData.isOpen}
          onClose={() => closeBubble(convId)}
        />
      ))}
    </MessengerContext.Provider>
  );
};
