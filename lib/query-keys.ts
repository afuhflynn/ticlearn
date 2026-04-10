// TanStack Query keys for TiCLearn

export const queryKeys = {
  // Auth
  session: ["session"] as const,

  // Notes
  notes: ["notes"] as const,
  note: (id: string) => ["notes", id] as const,
  noteStats: ["notes", "stats"] as const,

  // Quizzes
  quizzes: ["quizzes"] as const,
  quiz: (id: string) => ["quizzes", id] as const,
  quizAttempts: (quizId: string) => ["quizzes", quizId, "attempts"] as const,

  // Exams
  exams: ["exams"] as const,
  exam: (id: string) => ["exams", id] as const,

  // User Stats
  userStats: ["user-stats"] as const,
  leaderboard: ["leaderboard"] as const,

  // Subscriptions & Plans
  subscription: ["subscription"] as const,
  plan: ["plan"] as const,
  usage: ["usage"] as const,

  // Feedback
  feedbacks: ["feedbacks"] as const,
  feedback: (id: string) => ["feedbacks", id] as const,

  // Affiliate
  affiliate: ["affiliate"] as const,
  affiliateStats: ["affiliate", "stats"] as const,
  affiliateEarnings: ["affiliate", "earnings"] as const,

  // Rating
  rating: ["rating"] as const,
  hasRated: ["has-rated"] as const,

  // Admin
  adminUsers: ["admin", "users"] as const,
  adminStats: ["admin", "stats"] as const,
  adminSubscriptions: ["admin", "subscriptions"] as const,
  adminAffiliates: ["admin", "affiliates"] as const,

  // AI Chat
  chatConversations: ["chat", "conversations"] as const,
  chatConversation: (id: string) => ["chat", "conversations", id] as const,
  chatMessages: (conversationId: string) => ["chat", conversationId] as const,

  // Community
  communityPosts: ["community", "posts"] as const,
  communityPost: (id: string) => ["community", "posts", id] as const,
  communityComments: (postId: string) =>
    ["community", "posts", postId, "comments"] as const,

  // Notifications
  notifications: ["notifications"] as const,

  // Profile & Settings
  profile: ["profile"] as const,
  settings: ["settings"] as const,

  // Search
  search: (query: string) => ["search", query] as const,
} as const;

export type QueryKey = typeof queryKeys;
