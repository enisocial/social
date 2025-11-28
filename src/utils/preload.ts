
// PRÉCHARGEMENT ULTRA-AGRESSIF
import { cacheService } from '@/services/cache.service';
import { supabase } from '@/integrations/supabase/client';

// Précharger TOUT au démarrage de l'app
export const preloadEverything = async (userId: string) => {
  console.log('🔥 PRÉCHARGEMENT ULTRA-AGRESSIF DÉMARRÉ');

  try {
    // Précharger le feed principal
    const feedPromises = [];
    for (let page = 0; page < 3; page++) { // Précharger 3 pages
      feedPromises.push(
        supabase.from('posts')
          .select('id, content, created_at, user_id')
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .range(page * 10, (page + 1) * 10 - 1)
          .then(({ data }) => {
            if (data) {
              cacheService.set(
                `ultra-fast-feed-${userId}-recommended-${page}`,
                { posts: data, nextOffset: (page + 1) * 10 },
                30 * 60 * 1000 // 30 minutes
              );
            }
          })
      );
    }

    await Promise.allSettled(feedPromises);
    console.log('✅ FEED PRÉCHARGÉ (3 pages)');

    // Précharger les conversations récentes
    const conversations = await supabase
      .from('conversations')
      .select('id')
      .limit(5);

    if (conversations.data) {
      const messagePromises = conversations.data.map(conv =>
        supabase.from('messages')
          .select('id, content, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(({ data }) => {
            if (data) {
              cacheService.set(
                `ultra-fast-messages-${conv.id}`,
                data.reverse(),
                10 * 60 * 1000 // 10 minutes
              );
            }
          })
      );

      await Promise.allSettled(messagePromises);
      console.log('✅ MESSAGES PRÉCHARGÉS (5 conversations)');
    }

    console.log('🎉 PRÉCHARGEMENT TERMINÉ - APP ULTRA-RAPIDE !');

  } catch (error) {
    console.warn('⚠️ Erreur préchargement (non critique):', error);
  }
};
