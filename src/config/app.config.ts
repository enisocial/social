// Global application configuration for performance and scalability

export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  FEED_PAGE_SIZE: 15,
  COMMENTS_PAGE_SIZE: 10,
  MESSAGES_PAGE_SIZE: 30,
  TIMEOUT: 30000, // 30 seconds
} as const;

export const CACHE_CONFIG = {
  DEFAULT_CACHE: 2 * 60 * 1000, // 2 minutes - optimized
  SHORT_CACHE: 30 * 1000, // 30 seconds - faster refresh
  LONG_CACHE: 10 * 60 * 1000, // 10 minutes - balanced
  STATIC_CACHE: 60 * 60 * 1000, // 1 hour
} as const;

export const RATE_LIMIT_CONFIG = {
  LIKE_LIMIT: 20,
  COMMENT_LIMIT: 10,
  POST_LIMIT: 5,
  FOLLOW_LIMIT: 30,
  MESSAGE_LIMIT: 30,
  UPLOAD_LIMIT: 10,
} as const;

export const MEDIA_CONFIG = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  IMAGE_QUALITY: 0.85,
  MAX_IMAGE_WIDTH: 1920,
  MAX_IMAGE_HEIGHT: 1920,
} as const;

export const REALTIME_CONFIG = {
  DEBOUNCE_DELAY: 300, // 300ms - faster response
  THROTTLE_DELAY: 500, // 500ms - smoother
  RECONNECT_DELAY: 1500, // 1.5 seconds - faster reconnect
} as const;

export const STORAGE_CONFIG = {
  BUCKET_MEDIA: 'media',
  BUCKET_AVATARS: 'avatars',
  BUCKET_COVERS: 'covers',
} as const;

export const SEARCH_CONFIG = {
  MIN_SEARCH_LENGTH: 2,
  SEARCH_DEBOUNCE: 300, // 300ms
  MAX_SEARCH_RESULTS: 50,
} as const;
