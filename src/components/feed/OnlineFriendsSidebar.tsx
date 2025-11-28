import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePresenceRealtime } from '@/hooks/useChatFeatures';
import { useMessenger } from '@/contexts/MessengerContext';
import { useMessengerBadges } from '@/hooks/useMessengerBadges';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const OnlineFriendsSidebar = () => {
  const { isUserOnline, getLastSeen } = usePresenceRealtime();
  const { openBubble, conversations } = useMessenger();
  const { getConversationUnreadCount } = useMessengerBadges();

  const { data: friends, isLoading } = useQuery({
    queryKey: ['online-friends-sidebar'],
    queryFn: async () => {
      // Récupérer les amis de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: friends } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          sender:profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(12);

      // Utiliser le système centralisé de badges
      const friendsWithCounts = friends?.map((req: any) => {
        const friend = req.sender_id === user.id ? req.receiver : req.sender;
        const isOnline = isUserOnline(friend.id);
        const lastSeen = getLastSeen(friend.id);

        // IMPORTANT: Trouver l'ID de conversation pour cet ami
        // Cette logique devrait être optimisée avec une vraie relation
        let conversationId = null;

        return {
          ...friend,
          isOnline,
          lastSeen,
          conversationId, // À déterminer dynamiquement
          unreadCount: 0 // Sera mis à jour dynamiquement
        };
      }) || [];

      return friendsWithCounts.sort((a, b) => {
        // Trier par statut en ligne d'abord, puis par nom
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return a.name.localeCompare(b.name);
      });
    },
    staleTime: 30000, // 30 secondes
  });

  // Cache des conversations pour ouverture rapide
  const [conversationCache, setConversationCache] = useState<{ [friendId: string]: string | null }>({});

  // DEBUG: Forcer refresh du composant pour synchronisation
  const [, forceUpdate] = useState({});
  const triggerUpdate = () => forceUpdate({});

  const handleFriendClick = async (friend: any) => {
    console.log('👆 [SIDEBAR] Clic sur ami détecté:', friend.name, 'ID:', friend.id);

    // VÉRIFIER QUE LE CONTEXTE EST DISPONIBLE
    if (!openBubble) {
      console.error('❌ [SIDEBAR] openBubble non disponible dans le contexte');
      return;
    }

    console.log('✅ [SIDEBAR] Contexte Messenger disponible');

    // UTILISER LA NOUVELLE FONCTION OPTIMISÉE DU MESSENGER CONTEXT
    // Elle gère automatiquement la recherche/création de conversation
    try {
      console.log('🚀 [SIDEBAR] Appel openBubble avec:', {
        conversationId: null,
        otherUser: {
          id: friend.id,
          name: friend.name,
          username: friend.username,
          avatar_url: friend.avatar_url
        }
      });

      const result = await openBubble(null, {  // Passer null pour déclencher la recherche/création
        id: friend.id,
        name: friend.name,
        username: friend.username,
        avatar_url: friend.avatar_url
      });

      console.log('✅ [SIDEBAR] Chat ouvert avec succès pour:', friend.name, 'Résultat:', result);

      // Vérifier l'état des conversations après ouverture
      setTimeout(() => {
        console.log('🔍 [SIDEBAR] État des conversations après ouverture:', Array.from(conversations.entries()));
      }, 1000);

    } catch (error) {
      console.error('💥 [SIDEBAR] Erreur ouverture chat:', error);
      // Afficher plus de détails sur l'erreur
      if (error instanceof Error) {
        console.error('💥 [SIDEBAR] Détails erreur:', error.message, error.stack);
      }
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return '';
    try {
      return formatDistanceToNow(new Date(lastSeen), {
        addSuffix: true,
        locale: fr
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Amis en ligne</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const onlineCount = friends?.filter(friend => friend.isOnline).length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Amis en ligne • {onlineCount}
        </h3>
      </div>

      <div className="space-y-3">
        {friends?.map((friend) => (
          <button
            key={friend.id}
            onClick={() => handleFriendClick(friend)}
            className="w-full flex items-center gap-3 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group text-left"
          >
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={friend.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {friend.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de statut */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                friend.isOnline
                  ? 'bg-green-500' // En ligne - point vert
                  : 'bg-gray-400'  // Hors ligne - cercle gris
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600">
                  {friend.name}
                </span>
                {friend.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {friend.unreadCount}
                  </Badge>
                )}
              </div>
              {!friend.isOnline && friend.lastSeen && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Vu {formatLastSeen(friend.lastSeen)}
                </div>
              )}
            </div>
          </button>
        ))}

        {onlineCount === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            Aucun ami en ligne
          </div>
        )}
      </div>
    </div>
  );
};
