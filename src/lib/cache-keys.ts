/**
 * Centralized cache key management
 * Helps maintain consistency and makes cache invalidation easier
 */

export const CacheKeys = {
  // School data cache keys
  school: {
    data: (schoolName: string, majorName: string) =>
      `school:${schoolName.toLowerCase()}:${majorName.toLowerCase()}`,
    status: (schoolName: string, majorName: string) =>
      `school:status:${schoolName.toLowerCase()}:${majorName.toLowerCase()}`,
    all: () => 'school:*',
  },

  // User data cache keys
  user: {
    profile: (userId: string) => `user:${userId}:profile`,
    subscription: (userId: string) => `user:${userId}:subscription`,
    usage: (userId: string) => `user:${userId}:usage`,
    all: (userId: string) => `user:${userId}:*`,
  },

  // Draft cache keys
  draft: {
    single: (draftId: string) => `draft:${draftId}`,
    userDrafts: (userId: string) => `drafts:user:${userId}`,
    all: () => 'draft:*',
  },

  // Rate limiting keys
  rateLimit: {
    api: (userId: string, endpoint: string) => `ratelimit:${userId}:${endpoint}`,
    ip: (ip: string, endpoint: string) => `ratelimit:ip:${ip}:${endpoint}`,
    aiEdit: (userId: string) => `ratelimit:ai:edit:${userId}`,
    customization: (userId: string) => `ratelimit:ai:customize:${userId}`,
    schoolFetch: (userId: string) => `ratelimit:school:fetch:${userId}`,
  },

  // Session keys
  session: {
    user: (sessionId: string) => `session:${sessionId}`,
    all: () => 'session:*',
  },
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2592000,

  // Specific data type TTLs
  SCHOOL_DATA: 3600, // 1 hour (as per spec)
  USER_PROFILE: 300, // 5 minutes
  USER_USAGE: 60, // 1 minute (frequently updated)
  DRAFT_DATA: 300, // 5 minutes
} as const;
