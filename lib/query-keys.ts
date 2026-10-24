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

  // User Stats
  userStats: ["user-stats"] as const,

  // Dashboard continue surface
  dashboardContinue: ["dashboard", "continue"] as const,

  // Subscriptions & Plans
  subscription: ["subscription"] as const,
  plan: ["plan"] as const,
  usage: ["usage"] as const,

  // Credits
  credits: ["credits"] as const,

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
  chatMessagesPaginated: (conversationId: string) =>
    ["chat", conversationId, "paginated"] as const,

  // Profile & Settings
  profile: ["profile"] as const,
  settings: ["settings"] as const,

  // payment
  paymentSettings: ["payment", "settings"],
  savePaymentSettings: ["update-payment", "settings"],

  adminMetrics: (params?: Record<string, unknown>) =>
    ["admin", "metrics", params] as const,
  adminRetention: ["admin", "metrics", "retention"] as const,
} as const;

export type QueryKey = typeof queryKeys;
