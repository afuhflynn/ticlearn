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

  // Credits
  credits: ["credits"] as const,

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
  chatMessagesPaginated: (conversationId: string) =>
    ["chat", conversationId, "paginated"] as const,

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

  // payment
  paymentSettings: ["payment", "settings"],
  savePaymentSettings: ["update-payment", "settings"],

  // General Questions
  practiceQuestions: ["practice-questions"] as const,

  // GCE Paper 3
  paper3Sources: ["paper3", "sources"],
  paper3Source: (id: string) => ["paper3", "sources", id],
  paper3Questions: ["paper3", "questions"],
  paper3Question: (id: string) => ["paper3", "questions", id],
  paper3Mocks: ["paper3", "mocks"],
  paper3Mock: (id: string) => ["paper3", "mocks", id],
  paper3Practice: ["paper3", "practice"],
  paper3PracticeQuestion: (id: string) => ["paper3", "practice", id],
  paper3Stats: ["paper3", "stats"],
  paper3Recommendations: ["paper3", "recommendations"],
  paper3Leaderboard: (mockId: string) => ["paper3", "leaderboard", mockId],
  paper3MyAttempts: ["paper3", "my-attempts"],
  paper3MockAttempt: (id: string) => ["paper3", "attempts", id],
  adminMetrics: (params?: Record<string, unknown>) =>
    ["admin", "metrics", params] as const,
  adminRetention: ["admin", "metrics", "retention"] as const,
} as const;

export type QueryKey = typeof queryKeys;
