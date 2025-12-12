/**
 * OPTIMIZED: Centralized Supabase Service Layer
 * 
 * Benefits:
 * - Single point of configuration
 * - Easy mocking for tests
 * - Portable across different Supabase instances
 * - Consistent error handling
 * - Request deduplication
 * - Caching strategy
 */

import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor, errorTracker, apiTracker } from '@/utils/monitoring.utils';

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Generate cache key for request
 */
const getCacheKey = (table: string, query: any): string => {
  return `${table}:${JSON.stringify(query)}`;
};

/**
 * Deduplicated query wrapper
 * Prevents multiple identical requests from executing simultaneously
 */
export const deduplicatedQuery = async <T>(
  cacheKey: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    console.log('[DEDUPE] Reusing pending request:', cacheKey);
    return pendingRequests.get(cacheKey);
  }

  // Execute new request
  const promise = performanceMonitor.measureAsync(
    `query:${cacheKey}`,
    async () => {
      try {
        const result = await queryFn();
        return result;
      } finally {
        // Remove from pending after completion
        pendingRequests.delete(cacheKey);
      }
    }
  );

  // Store pending request
  pendingRequests.set(cacheKey, promise);
  return promise;
};

/**
 * Conversations Service
 */
export const conversationsService = {
  /**
   * Get user conversations with optimized query
   */
  async getUserConversations(userId: string) {
    const cacheKey = getCacheKey('conversations', { userId });
    
    return deduplicatedQuery(cacheKey, async () => {
      const startTime = performance.now();
      
      const { data: myParticipants, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          unread_count,
          conversations!inner(
            id,
            created_at,
            updated_at,
            type,
            title
          )
        `)
        .eq('user_id', userId)
        .order('conversations(updated_at)', { ascending: false });

      const duration = performance.now() - startTime;
      apiTracker.track('GET /conversation_participants', 'GET', duration, error ? 500 : 200);

      if (error) {
        errorTracker.track(error, { context: 'getUserConversations', userId });
        throw error;
      }

      return myParticipants;
    });
  },

  /**
   * Reset unread count with deduplication
   */
  async resetUnreadCount(userId: string, conversationId: string) {
    const cacheKey = `reset_unread:${userId}:${conversationId}`;
    
    return deduplicatedQuery(cacheKey, async () => {
      const startTime = performance.now();
      
      const { error } = await supabase.rpc('force_reset_unread_count', {
        p_user_id: userId,
        p_conversation_id: conversationId
      });

      const duration = performance.now() - startTime;
      apiTracker.track('POST force_reset_unread_count', 'POST', duration, error ? 500 : 204);

      if (error) {
        errorTracker.track(error, { context: 'resetUnreadCount', userId, conversationId });
        throw error;
      }

      console.log('[SERVICE] Reset unread executed:', conversationId);
    });
  },

  /**
   * Create conversation with participant
   */
  async createConversation(currentUserId: string, otherUserId: string): Promise<string | null> {
    const cacheKey = `create_conv:${currentUserId}:${otherUserId}`;
    
    return deduplicatedQuery(cacheKey, async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.rpc(
        'create_conversation_with_participant',
        { other_user_id: otherUserId }
      );

      const duration = performance.now() - startTime;
      apiTracker.track('POST create_conversation', 'POST', duration, error ? 500 : 200);

      if (error) {
        errorTracker.track(error, { context: 'createConversation', currentUserId, otherUserId });
        throw error;
      }

      return data;
    });
  }
};

/**
 * Messages Service
 */
export const messagesService = {
  /**
   * Get messages for conversation with optimization
   */
  async getMessages(conversationId: string, userId: string, limit = 100) {
    const cacheKey = getCacheKey('messages', { conversationId, limit });
    
    return deduplicatedQuery(cacheKey, async () => {
      const startTime = performance.now();
      
      const [messagesResult, statusResult] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id (
              id,
              name,
              username,
              avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(limit),
        
        supabase
          .from('message_status')
          .select('message_id, delivered_at, read_at')
          .eq('user_id', userId)
      ]);

      const duration = performance.now() - startTime;
      apiTracker.track('GET /messages', 'GET', duration, messagesResult.error ? 500 : 200);

      if (messagesResult.error) {
        errorTracker.track(messagesResult.error, { context: 'getMessages', conversationId });
        throw messagesResult.error;
      }

      return { messages: messagesResult.data, statuses: statusResult.data };
    });
  },

  /**
   * Send message with optimization
   */
  async sendMessage(messageData: {
    conversation_id: string;
    sender_id: string;
    content: string;
    attachment_url?: string;
    attachment_type?: string;
    attachment_name?: string;
    reply_to?: string;
  }) {
    const startTime = performance.now();
    
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id, created_at')
      .single();

    const duration = performance.now() - startTime;
    apiTracker.track('POST /messages', 'POST', duration, error ? 500 : 201);

    if (error) {
      errorTracker.track(error, { context: 'sendMessage', messageData });
      throw error;
    }

    return data;
  }
};

/**
 * Presence Service
 */
export const presenceService = {
  /**
   * Update user presence
   */
  async updatePresence(userId: string, online: boolean) {
    const startTime = performance.now();
    
    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: userId,
      p_online: online
    });

    const duration = performance.now() - startTime;
    apiTracker.track('POST update_user_presence', 'POST', duration, error ? 500 : 204);

    if (error) {
      errorTracker.track(error, { context: 'updatePresence', userId, online });
      throw error;
    }
  },

  /**
   * Update typing status via realtime broadcast
   * Note: Uses broadcast (with deprecation warning) until typing_status table is created
   */
  async updateTypingStatus(channel: any, userId: string, isTyping: boolean) {
    if (!channel) return;
    
    try {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, typing: isTyping }
      });
    } catch (error) {
      errorTracker.track(error as Error, { context: 'updateTypingStatus' });
      throw error;
    }
  }
};

/**
 * Export monitoring report for debugging
 */
export const getServiceMonitoringReport = () => {
  return {
    pendingRequests: Array.from(pendingRequests.keys()),
    performance: performanceMonitor.getSummary(),
    api: apiTracker.getSummary(),
    errors: errorTracker.getRecentErrors()
  };
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabaseServiceDebug = {
    getReport: getServiceMonitoringReport,
    clearCache: () => pendingRequests.clear()
  };
}
