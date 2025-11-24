// Client-side rate limiting to prevent abuse

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimits: Record<string, RateLimitConfig> = {
  like: { maxRequests: 20, windowMs: 60000 }, // 20 likes per minute
  comment: { maxRequests: 10, windowMs: 60000 }, // 10 comments per minute
  post: { maxRequests: 5, windowMs: 300000 }, // 5 posts per 5 minutes
  follow: { maxRequests: 30, windowMs: 60000 }, // 30 follows per minute
  message: { maxRequests: 30, windowMs: 60000 }, // 30 messages per minute
  upload: { maxRequests: 10, windowMs: 300000 }, // 10 uploads per 5 minutes
};

interface RequestLog {
  timestamps: number[];
}

const requestLogs = new Map<string, RequestLog>();

export const checkRateLimit = (action: keyof typeof rateLimits): boolean => {
  const config = rateLimits[action];
  if (!config) return true;

  const now = Date.now();
  const log = requestLogs.get(action) || { timestamps: [] };

  // Remove old timestamps outside the window
  log.timestamps = log.timestamps.filter(
    (timestamp) => now - timestamp < config.windowMs
  );

  // Check if limit exceeded
  if (log.timestamps.length >= config.maxRequests) {
    return false;
  }

  // Add new timestamp
  log.timestamps.push(now);
  requestLogs.set(action, log);

  return true;
};

export const getRemainingRequests = (action: keyof typeof rateLimits): number => {
  const config = rateLimits[action];
  if (!config) return Infinity;

  const now = Date.now();
  const log = requestLogs.get(action) || { timestamps: [] };

  const validTimestamps = log.timestamps.filter(
    (timestamp) => now - timestamp < config.windowMs
  );

  return Math.max(0, config.maxRequests - validTimestamps.length);
};

export const clearRateLimits = () => {
  requestLogs.clear();
};
