// TiCLearn Type Definitions

import type {
  UserRole,
  Plan,
  SubscriptionStatus,
  FileType,
  NoteStatus,
  QuizStatus,
  QuestionType,
  ExamSubject,
  ExamMode,
  ExamStatus,
  FeedbackType,
  FeedbackStatus,
  AffiliateStatus,
  EarningStatus,
} from "@/lib/generated/prisma/client";

// ===========================================
// Enums (Re-exported for convenience)
// ===========================================

export type { UserRole, Plan, SubscriptionStatus };
export type { FileType, NoteStatus, QuizStatus, QuestionType };
export type { ExamSubject, ExamMode, ExamStatus };
export type { FeedbackType, FeedbackStatus };
export type { AffiliateStatus, EarningStatus };

// ===========================================
// User Types
// ===========================================

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  referredBy: string | null;
  refApplied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Note Types
// ===========================================

export interface NoteWithRelations {
  id: string;
  userId: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileName: string;
  fileType: "PDF" | "IMAGE";
  extractedText: string | null;
  topics: string[];
  summary: string | null;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  createdAt: Date;
  updatedAt: Date;
  user?: SafeUser;
  quizzes?: QuizSummary[];
}

export interface NoteSummary {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileName: string;
  fileType: "PDF" | "IMAGE";
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  createdAt: Date;
  quizCount?: number;
}

// ===========================================
// Quiz Types
// ===========================================

export interface QuizWithRelations {
  id: string;
  userId: string;
  noteId: string;
  noteTitle: string;
  title: string;
  questionCount: number;
  status: "GENERATING" | "READY" | "ERROR";
  isPublic: boolean;
  timed: boolean;
  timeLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
  user?: SafeUser;
  note?: NoteSummary;
  questions?: QuizQuestion[];
  attempts?: QuizAttemptSummary[];
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: "MCQ" | "OPEN";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  order: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  questionCount: number;
  status: "GENERATING" | "READY" | "ERROR";
  isPublic: boolean;
  createdAt: Date;
}

// ===========================================
// Quiz Attempt Types
// ===========================================

export interface QuizAttemptWithRelations {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  noteTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: Date;
  user?: SafeUser;
  quiz?: QuizSummary;
  answers?: QuizAttemptAnswer[];
}

export interface QuizAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizAttemptSummary {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: Date;
}

export interface QuizGenerationOptions {
  noteId: string;
  questionCount: 5 | 10 | 15 | 20;
  questionTypes: "MCQ" | "OPEN" | "MIXED";
  timed: boolean;
  timeLimit?: number;
  isPublic: boolean;
}

// ===========================================
// Exam Types
// ===========================================

export interface ExamSessionWithRelations {
  id: string;
  userId: string;
  subject: "CS" | "ICT";
  subjectLabel: string;
  mode: "MOCK" | "SIMULATION";
  topic: string;
  status: "GENERATING" | "READY" | "COMPLETED";
  score: number | null;
  timeLimit: number;
  timeTaken: number | null;
  questions: ExamQuestion[];
  answers: ExamAnswer[] | null;
  createdAt: Date;
  updatedAt: Date;
  user?: SafeUser;
}

export interface ExamQuestion {
  id: string;
  type: "MCQ" | "OPEN";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ExamAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface ExamGenerationOptions {
  subject: "CS" | "ICT";
  topic: string;
  mode: "MOCK" | "SIMULATION";
  questionCount: number;
}

// ===========================================
// User Stats Types
// ===========================================

export interface UserStatsWithUser {
  id: string;
  userId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  quizzesTaken: number;
  avgScore: number;
  user?: SafeUser;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userImage: string | null;
  totalPoints: number;
  quizzesTaken: number;
  currentStreak: number;
}

// ===========================================
// Subscription Types
// ===========================================

export interface SubscriptionWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: Plan;
  status: SubscriptionStatus;
  fapshiTransId: string | null;
  amount: number;
  activatedAt: Date | null;
  createdAt: Date;
  user?: SafeUser;
}

export interface PlanLimits {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
  canAccessGCE: boolean;
}

export const PLAN_LIMITS: Record<Exclude<Plan, "PREMIUM">, PlanLimits> = {
  STARTER: {
    pdfUploads: 10,
    quizGenerations: 20,
    aiTutorMessages: -1, // Unlimited
    canAccessCommunity: true,
    canAccessLeaderboard: true,
    canAccessGCE: true,
  },
  STANDARD: {
    pdfUploads: 30,
    quizGenerations: 60,
    aiTutorMessages: -1, // Unlimited
    canAccessCommunity: true,
    canAccessLeaderboard: true,
    canAccessGCE: true,
  },
};

export const PREMIUM_LIMITS: PlanLimits = {
  pdfUploads: -1, // Unlimited
  quizGenerations: -1, // Unlimited
  aiTutorMessages: -1, // Unlimited
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
};

export const FREE_LIMITS: PlanLimits = {
  pdfUploads: 2,
  quizGenerations: 4,
  aiTutorMessages: 8,
  canAccessCommunity: false,
  canAccessLeaderboard: false,
  canAccessGCE: false,
};

// ===========================================
// Feedback Types
// ===========================================

export interface FeedbackWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: "BUG" | "FEATURE" | "GENERAL";
  subject: string;
  message: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  isFlagged: boolean;
  isUrgent: boolean;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: SafeUser;
}

// ===========================================
// Affiliate Types
// ===========================================

export interface AffiliateWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  code: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  momoNumber: string | null;
  momoName: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  createdAt: Date;
  updatedAt: Date;
  user?: SafeUser;
}

export interface AffiliateEarningWithAffiliate {
  id: string;
  affiliateCode: string;
  affiliateEmail: string;
  referredUserEmail: string;
  plan: Plan;
  amount: number;
  commission: number;
  status: "PENDING" | "PAID";
  paidAt: Date | null;
  createdAt: Date;
}

// ===========================================
// Rating Types
// ===========================================

export interface RatingWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  score: number;
  comment: string | null;
  version: string;
  createdAt: Date;
  user?: SafeUser;
}

// ===========================================
// API Request/Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ===========================================
// Form Types
// ===========================================

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  referralCode?: string;
}

export interface SignInFormData {
  email: string;
  password: string;
}

export interface FeedbackFormData {
  type: "BUG" | "FEATURE" | "GENERAL";
  subject: string;
  message: string;
  isFlagged: boolean;
}

export interface AffiliateSignupFormData {
  momoNumber: string;
  momoName: string;
}

export interface PaymentInitiateRequest {
  plan: Exclude<Plan, "PREMIUM">;
  redirectUrl?: string;
}

export interface PaymentInitiateResponse {
  link: string;
  transId: string;
}

// ===========================================
// Dashboard Stats
// ===========================================

export interface DashboardStats {
  totalNotes: number;
  totalQuizzes: number;
  totalAttempts: number;
  avgScore: number;
  currentStreak: number;
  totalPoints: number;
}

export interface AdminStats {
  totalUsers: number;
  totalNotes: number;
  totalQuizzes: number;
  totalExams: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
  avgRating: number;
  recentFeedback: number;
  pendingAffiliates: number;
}
