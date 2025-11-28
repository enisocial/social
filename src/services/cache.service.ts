import { supabase } from '@/integrations/supabase/client';

/**
 * Cache Service - Client-side caching for improved performance
 * Version: 1.0.0
 * Date: Décembre 2025
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes - CACHE ULTRA-AGRESSIF
  private readonly MESSAGES_TTL = 10 * 60 * 1000; // 10 minutes for messages - CACHE MAXIMAL
  private readonly FEED_TTL = 20 * 60 * 1000; // 20 minutes for feed - CACHE ULTRA-LONG

  /**
   * Get cached data if still valid
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with TTL
   */
  set(key: string, data: any, ttl?: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(key)
    };

    this.cache.set(key, entry);

    // Auto-cleanup après TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, entry.ttl);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get default TTL based on key type
   */
  private getDefaultTTL(key: string): number {
    if (key.includes('messages') || key.includes('chat')) {
      return this.MESSAGES_TTL;
    }
    if (key.includes('feed') || key.includes('posts')) {
      return this.FEED_TTL;
    }
    return this.DEFAULT_TTL;
  }

  /**
   * Cache with async function
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    let data = this.get<T>(key);
    if (data !== null) {
      return data;
    }

    data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Preload data in background
   */
  preload(key: string, fetcher: () => Promise<any>, ttl?: number): void {
    if (this.has(key)) return; // Already cached

    fetcher()
      .then(data => this.set(key, data, ttl))
      .catch(err => console.warn(`Failed to preload ${key}:`, err));
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; keys: string[]; hitRate?: number } {
    const keys = Array.from(this.cache.keys());
    return {
      size: this.size(),
      keys
    };
  }
}

// Helper pour appeler les fonctions Supabase Edge avec Redis
export const callSupabaseEdgeFunction = async (
  functionName: string,
  payload: any,
  options: { useCache?: boolean; cacheKey?: string; cacheTTL?: number } = {}
) => {
  const { useCache = true, cacheKey, cacheTTL } = options;

  // Vérifier le cache client d'abord
  if (useCache && cacheKey) {
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Cacher le résultat côté client si demandé
    if (useCache && cacheKey && result) {
      cacheService.set(cacheKey, result, cacheTTL);
    }

    return result;
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
};

// Singleton instance
export const cacheService = new CacheService();

// Helper hooks for React components
export const useCache = () => {
  return {
    get: <T = any>(key: string) => cacheService.get<T>(key),
    set: (key: string, data: any, ttl?: number) => cacheService.set(key, data, ttl),
    has: (key: string) => cacheService.has(key),
    delete: (key: string) => cacheService.delete(key),
    clear: () => cacheService.clear(),
    size: () => cacheService.size(),
    stats: () => cacheService.getStats()
  };
};

// Specialized cache keys
export const CACHE_KEYS = {
  // Messages
  messages: (conversationId: string, limit = 50) => `messages:${conversationId}:${limit}`,
  conversations: (userId: string) => `conversations:${userId}`,

  // Feed
  feed: (userId: string, filter: string, page = 0) => `feed:${userId}:${filter}:${page}`,

  // User data
  profile: (userId: string) => `profile:${userId}`,
  friends: (userId: string) => `friends:${userId}`,

  // Media
  media: (url: string) => `media:${url}`,

  // General
  api: (endpoint: string, params?: any) => `api:${endpoint}:${JSON.stringify(params)}`
} as const;
