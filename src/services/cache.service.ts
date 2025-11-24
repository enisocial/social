import { CACHE_CONFIG } from '@/config/app.config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: number | null = null;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  set<T>(key: string, data: T, ttl = CACHE_CONFIG.DEFAULT_CACHE): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const keys = Array.from(this.cache.keys());
      
      keys.forEach(key => {
        const entry = this.cache.get(key);
        if (entry && now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      });
    }, 5 * 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cacheService = new CacheService();

// Helper functions for common cache operations
export const getCachedOrFetch = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = cacheService.get<T>(key);
  
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  cacheService.set(key, data, ttl);
  return data;
};
