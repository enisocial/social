import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FacebookMessenger } from '@/components/messenger/FacebookMessenger';
import { ChatBubble } from '@/components/messenger/ChatBubble';
import { useMessengerBadges } from '@/hooks/useMessengerBadges';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ConversationData {
  id: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  isOpen: boolean;
  resolving?: boolean;
}

interface MessengerContextType {
  conversations: Map<string, ConversationData>;
  openBubble: (conversationId: string | null, otherUser: any) => void;
  closeBubble: (conversationId: string) => void;
  toggleBubble: (conversationId: string, otherUser: any) => void;
  toggleMinimize?: (conversationId: string) => void;
  clearUnread?: (conversationId: string) => void;
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
      toggleMinimize: () => {},
      clearUnread: () => {}
    };
  }
  return context;
};

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Map<string, ConversationData>>(new Map());
  const { markConversationAsRead, forceRefresh } = useMessengerBadges();
  const { createConversation } = useConversations();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // ÉCOUTER LES NOUVEAUX MESSAGES POUR TOUTES LES CONVERSATIONS - SIMPLIFIÉ
  React.useEffect(() => {
    if (!user) {
      console.log('❌ [GLOBAL] Pas d\'utilisateur connecté pour l\'écoute globale');
      return;
    }

    console.log('🎧 [GLOBAL] Configuration écoute globale des messages pour user:', user.id);
    console.log('🎧 [GLOBAL] User object:', user);

    const globalChannel = supabase
      .channel(`global_messages_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        const newMessage = payload.new as any;
        console.log('📨 [GLOBAL] Nouveau message détecté:', {
          id: newMessage.id,
          conversationId: newMessage.conversation_id,
          senderId: newMessage.sender_id,
          content: newMessage.content?.substring(0, 50),
          timestamp: newMessage.created_at
        });

        // VÉRIFIER SI L'UTILISATEUR ACTUEL EST LE DESTINATAIRE
        const isCurrentUserSender = newMessage.sender_id === user.id;

        if (isCurrentUserSender) {
          console.log('📤 [GLOBAL] Message envoyé par l\'utilisateur actuel - ignoré');
          return;
        }

        // VÉRIFIER SI CETTE CONVERSATION EST DÉJÀ OUVERTE
        const existingConversation = conversations.get(newMessage.conversation_id);

        if (existingConversation) {
          console.log('💬 [GLOBAL] Conversation déjà ouverte - message géré par listener spécifique');
          // Le message sera géré par le listener spécifique de la conversation
        } else {
          console.log('🔔 [GLOBAL] Notification de nouveau message - conversation pas ouverte');

          // RAFRAÎCHIR LES BADGES POUR METTRE À JOUR LE COMPTEUR
          forceRefresh();

          // AFFICHAGE D'UNE NOTIFICATION DANS L'APP (SIMPLE ALERT POUR L'INSTANT)
          // Plus tard on pourra ajouter un système de notifications dans l'UI
          console.log('🔔 [NOTIFICATION] Vous avez reçu un nouveau message !');
          toast.info('Nouveau message reçu !');

          // OPTIONNEL : Ouvrir automatiquement la conversation (désactivé pour l'instant)
          /*
          try {
            const { data: sender, error: senderError } = await supabase
              .from('profiles')
              .select('id, name, username, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();

            if (sender && !senderError) {
              const newConversation = {
                id: newMessage.conversation_id,
                otherUser: {
                  id: sender.id,
                  name: sender.name,
                  username: sender.username,
                  avatar_url: sender.avatar_url
                },
                isOpen: false, // Ne pas ouvrir automatiquement, juste notifier
                resolving: false
              };

              setConversations(prev => {
                const updated = new Map(prev);
                updated.set(newMessage.conversation_id, newConversation);
                return updated;
              });

              console.log('✅ [GLOBAL] Conversation ajoutée (fermée) avec notification');
            }
          } catch (error) {
            console.error('❌ [GLOBAL] Erreur ajout conversation fermée:', error);
          }
          */
        }
      })
      .subscribe((status, err) => {
        console.log('📡 [GLOBAL] Statut abonnement global:', status, err ? `Erreur: ${err}` : 'OK');

        if (status === 'SUBSCRIBED') {
          console.log('✅ [GLOBAL] Abonnement global réussi - prêt à recevoir des notifications');
        } else if (status === 'CLOSED') {
          console.log('❌ [GLOBAL] Abonnement global fermé');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ [GLOBAL] Erreur abonnement global:', err);
        }
      });

    return () => {
      console.log('🧹 [GLOBAL] Nettoyage abonnement global');
      supabase.removeChannel(globalChannel);
    };
  }, [user?.id, forceRefresh]);

  // CRÉER OU TROUVER UNE CONVERSATION - UTILISE LA VRAIE LOGIQUE DB
  const findOrCreateConversation = useCallback(async (otherUserId: string, otherUserData: any) => {
    console.log('🔍 [CONV] Création/récupération conversation avec:', otherUserId);

    try {
      // UTILISER LA FONCTION createConversation DU HOOK useConversations
      const conversationId = await createConversation(otherUserId);

      if (!conversationId) {
        throw new Error('Impossible de créer/récupérer la conversation');
      }

      console.log('✅ [CONV] Conversation créée/récupérée:', conversationId);
      return conversationId;

    } catch (error) {
      console.error('❌ [CONV] Erreur création conversation:', error);
      throw error;
    }
  }, [createConversation]);

  // OUVRIR UNE CONVERSATION - VERSION INSTANTANÉE AVEC GESTION D'ÉTAT
  const openBubble = useCallback(async (conversationId: string | null, otherUser: any) => {
    console.log('🚀 [OPEN] Opening chat bubble:', { conversationId, otherUser });

    // SI ON A DÉJÀ UN CONVERSATIONID VALIDE, OUVRIR DIRECTEMENT
    if (conversationId && !conversationId.startsWith('temp_')) {
      console.log('✅ [OPEN] ID valide, ouverture directe:', conversationId);
      setConversations(prev => {
        const existing = prev.get(conversationId);
        if (existing) {
          console.log('🔄 [OPEN] Chat déjà ouvert:', conversationId);
          return new Map(prev).set(conversationId, { ...existing, isOpen: true });
        } else {
          console.log('🆕 [OPEN] Nouvelle conversation:', conversationId);
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

      // TEMPORAIREMENT DÉSACTIVÉ POUR ÉVITER ERREURS RLS
      // markConversationAsRead(conversationId).catch(error => {
      //   console.error('Erreur marquage comme lu:', error);
      // });

      return;
    }

    // CAS NOUVEAU CHAT: CRÉER TEMPORAIREMENT PUIS RÉSOUDRE
    const tempId = `temp_${Date.now()}_${otherUser.id}`;
    console.log('⚡ [OPEN] Création temporaire:', tempId);

    setConversations(prev => new Map(prev).set(tempId, {
      id: tempId,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username,
        avatar_url: otherUser.avatar_url
      },
      isOpen: true,
      resolving: true // État spécial pour indiquer résolution en cours
    }));

    // RÉSOUDRE LA CONVERSATION IMMÉDIATEMENT (PLUS DE TIMEOUT)
    if (otherUser?.id) {
      try {
        const finalId = await findOrCreateConversation(otherUser.id, otherUser);
        console.log('🎯 [OPEN] Résolution réussie:', finalId);

        setConversations(prev => {
          const tempData = prev.get(tempId);
          if (tempData) {
            console.log('🔄 [OPEN] Remplacement temp par réel');
            const newMap = new Map(prev);
            newMap.delete(tempId);
            newMap.set(finalId, {
              ...tempData,
              id: finalId,
              resolving: false
            });
            return newMap;
          }
          return prev;
        });

        // TEMPORAIREMENT DÉSACTIVÉ POUR ÉVITER ERREURS RLS
        // markConversationAsRead(finalId as string).catch(error => {
        //   console.error('Erreur marquage comme lu:', error);
        // });

        // FORCE LE RE-RENDER DU COMPOSANT AVEC LE NOUVEL ID POUR CHARGER LES MESSAGES
        console.log('🔄 [OPEN] Forçage re-render pour chargement messages avec ID réel');

      } catch (error) {
        console.error('❌ [OPEN] Échec résolution:', error instanceof Error ? error.message : String(error));
        // FERMER LA CHATBUBBLE APRÈS 3 SECONDES SI ÉCHEC
        setTimeout(() => {
          setConversations(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });
        }, 3000);
      }
    }

  }, [findOrCreateConversation, markConversationAsRead]);

  // FERMER UNE CONVERSATION
  const closeBubble = useCallback((conversationId: string) => {
    console.log('❌ [MESSENGER] Fermeture conversation:', conversationId);
    setConversations(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  // BASCULER OUVERTURE/FERMETURE
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

  // MINIMISER/MAXIMISER UNE CONVERSATION (toggle entre minimisé et ouvert)
  const toggleMinimize = useCallback((conversationId: string) => {
    setConversations(prev => {
      const existing = prev.get(conversationId);
      if (existing) {
        // Basculer l'état isOpen (qui contrôle si c'est minimisé ou ouvert)
        return new Map(prev).set(conversationId, {
          ...existing,
          isOpen: !existing.isOpen
        });
      }
      return prev;
    });
  }, []);

  // MARQUER LES MESSAGES COMME LUS (wrapper pour markConversationAsRead)
  const clearUnread = useCallback(async (conversationId: string) => {
    try {
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Erreur clearUnread:', error);
    }
  }, [markConversationAsRead]);

  const value = {
    conversations,
    openBubble,
    closeBubble,
    toggleBubble,
    toggleMinimize,
    clearUnread
  };

  return (
    <MessengerContext.Provider value={value}>
      {children}

      {/* RENDRE LES CONVERSATIONS OUVERTES - MEME DESIGN POUR MOBILE ET WEB */}
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
