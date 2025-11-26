import { useMessenger } from '@/contexts/MessengerContext';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { cacheService } from '@/services/cache.service';
import { CACHE_CONFIG } from '@/config/app.config';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export const useChatActions = () => {
  const { openBubble } = useMessenger();
  const { createConversation } = useConversations();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const openChatWithUser = async (
    userId: string,
    userInfo?: { name: string; username: string; avatar_url: string | null }
  ) => {
    try {
      // 1. Get User Info (Cache -> Supabase)
      const userCacheKey = `chat_user_${userId}`;
      let userData = userInfo || cacheService.get<typeof userInfo>(userCacheKey);

      if (!userData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url')
          .eq('id', userId)
          .single();

        if (profile) {
          userData = profile;
          cacheService.set(userCacheKey, profile, CACHE_CONFIG.LONG_CACHE);
        }
      }

      if (!userData) {
        toast.error('Utilisateur non trouvé');
        return;
      }

      // 2. Get Conversation ID (Cache -> Create/Fetch)
      // We cache the conversation ID for this user pair to avoid "temp" IDs and UI flickering
      const convCacheKey = `chat_conv_id_${userId}`;
      let conversationId = cacheService.get<string>(convCacheKey);

      if (!conversationId) {
        // If not in cache, create/fetch it
        conversationId = await createConversation(userId);
        if (conversationId) {
          cacheService.set(convCacheKey, conversationId, CACHE_CONFIG.LONG_CACHE);
        }
      }

      // 3. Open Bubble
      if (conversationId) {
        openBubble(conversationId, {
          id: userId,
          name: userData.name,
          username: userData.username,
          avatar_url: userData.avatar_url
        });

        // 4. Optimistically update Online Friends list to link this user to this conversation
        // This ensures the badge disappears immediately even if the list hasn't refetched yet
        if (user?.id) {
          queryClient.setQueryData(['online-friends', user.id], (oldData: any[]) => {
            if (!oldData) return oldData;
            return oldData.map(friend => {
              if (friend.id === userId) {
                return { ...friend, conversation_id: conversationId };
              }
              return friend;
            });
          });
        }
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  };

  return { openChatWithUser };
};
