/**
 * Redis Cache Service
 * 
 * Provides caching layer using Upstash Redis for improved performance.
 * Falls back gracefully if Redis is unavailable.
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

class RedisService {
  private baseUrl: string = '';
  private token: string = '';
  private enabled: boolean = false;

  constructor() {
    // Redis credentials are only available server-side in edge functions
    // This client is for frontend reference only
  }

  /**
   * Initialize Redis connection (server-side only)
   */
  initialize(url: string, token: string) {
    this.baseUrl = url;
    this.token = token;
    this.enabled = !!(url && token);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const url = options.ttl 
        ? `${this.baseUrl}/setex/${key}/${options.ttl}`
        : `${this.baseUrl}/set/${key}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      return response.ok;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/del/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/exists/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern (server-side helper)
   */
  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      // This would typically be done via edge function
      // Pattern matching requires SCAN command
      console.log('Invalidating pattern:', pattern);
      return true;
    } catch (error) {
      console.error('Redis invalidate pattern error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Cache key builders
export const cacheKeys = {
  feed: (userId: string, filter: string = 'recommended') => `feed:${userId}:${filter}`,
  friendSuggestions: (userId: string) => `friend-suggestions:${userId}`,
  userProfile: (userId: string) => `user:${userId}`,
  post: (postId: string) => `post:${postId}`,
  timeline: (userId: string) => `timeline:${userId}`,
  liveStreams: () => `live-streams:active`,
};

// Cache TTLs in seconds
export const cacheTTL = {
  feed: 60, // 1 minute
  friendSuggestions: 300, // 5 minutes
  userProfile: 600, // 10 minutes
  post: 300, // 5 minutes
  timeline: 60, // 1 minute
  liveStreams: 30, // 30 seconds
};
