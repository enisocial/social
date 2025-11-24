import { useMessenger } from '@/contexts/MessengerContext';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { cacheService } from '@/services/cache.service';
import { CACHE_CONFIG } from '@/config/app.config';
import { toast } from 'sonner';

export const useChatActions = () => {
  const { openBubble, closeBubble } = useMessenger();
  const { createConversation } = useConversations();

  const openChatWithUser = async (
    userId: string,
    userInfo?: { name: string; username: string; avatar_url: string | null }
  ) => {
    try {
      const cacheKey = `chat_user_${userId}`;
      let userData = cacheService.get<typeof userInfo>(cacheKey);

      // If userInfo provided directly, use it immediately - INSTANT OPEN
      if (userInfo) {
        userData = userInfo;
        cacheService.set(cacheKey, userInfo, CACHE_CONFIG.LONG_CACHE);
        
        // Open bubble INSTANTLY with temp conversation ID
        const tempConvId = `temp_${userId}`;
        openBubble(tempConvId, {
          id: userId,
          name: userData.name,
          username: userData.username,
          avatar_url: userData.avatar_url
        });

        // Create conversation in background and replace temp ID
        const conversationId = await createConversation(userId);
        if (conversationId && conversationId !== tempConvId) {
          closeBubble(tempConvId);
          openBubble(conversationId, {
            id: userId,
            name: userData.name,
            username: userData.username,
            avatar_url: userData.avatar_url
          });
        }
        return;
      }

      // No userInfo provided - need to fetch
      if (!userData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_url')
          .eq('id', userId)
          .single();

        if (profile) {
          userData = profile;
          cacheService.set(cacheKey, profile, CACHE_CONFIG.LONG_CACHE);
        }
      }

      if (!userData) {
        toast.error('Utilisateur non trouvé');
        return;
      }

      // Open with fetched data
      const conversationId = await createConversation(userId);
      if (conversationId) {
        openBubble(conversationId, {
          id: userId,
          name: userData.name,
          username: userData.username,
          avatar_url: userData.avatar_url
        });
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  };

  return { openChatWithUser };
};
