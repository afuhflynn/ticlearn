// TiCLearn Type Definitions

import type {
  Affiliate,
  AffiliateClick,
  AffiliateEarning,
  AffiliateStatus,
  EarningStatus,
  ExamMode,
  ExamStatus,
  ExamSubject,
  FeedbackStatus,
  FeedbackType,
  FileType,
  NoteStatus,
  Plan,
  QuestionType,
  QuizStatus,
  SubscriptionStatus,
  UserRole,
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
  canAccessLeaderboard: true,
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
// Type Definitions
// ===========================================

export interface QuizQuestion {
  id: string;
  type: "MCQ" | "OPEN";
  question: string;
  options: string[];
  correctAnswer: string;
  order: number;
  explanation?: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  noteTitle: string;
  status: "GENERATING" | "READY" | "ERROR";
  timed: boolean;
  timeLimit: number | null;
  isPublic: boolean;
  questionCount: number;
  questions: QuizQuestion[];
}

export interface NoteSummary {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "WORD";
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  summary?: string | null;
  topics?: string[];
  quizCount?: number;
  createdAt: string;
}

export interface NoteWithRelations extends NoteSummary {
  userId: string;
  extractedText?: string | null;
  keyPoints?: string[];
  quizzes: Quiz[];
}

export interface UsageData {
  plan: string;
  status: string;
  previousPlan?: string | null;
  limits: {
    pdfUploads: number;
    quizGenerations: number;
    aiTutorMessages: number;
    canAccessCommunity: boolean;
    canAccessLeaderboard: boolean;
    canAccessGCE: boolean;
  };
  usage: {
    pdfUploads: number;
    quizGenerations: number;
    aiTutorMessages: number;
  };
  canUpload: boolean;
  canGenerateQuiz: boolean;
  canUseAIChat: boolean;
  chatDailyUsage: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
    resetsInSeconds: number;
  } | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string | null;
  subject?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
  createdAt: string;
}

export interface AffiliateData {
  code: string;
  totalClicks: number;
  totalReferrals: number;
  earnings: number | Earning[];
  pendingPayout: number;
  id?: string;
  status?: string;
  momoNumber?: string | null;
  momoName?: string | null;
  totalConversions?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  paidEarnings?: number;
  referredUsers?: {
    id: string;
    name: string;
    email: string;
    joinedAt: string;
    emailVerified: boolean;
  }[];
}

export interface Earning {
  id: string;
  referredUserEmail: string;
  plan: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
  requestedAt: string | null;
  paidAt: string | null;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  type: string;
  subject?: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  title: string;
  subject: string;
  status: "GENERATING" | "READY" | "COMPLETED";
  questions: unknown[];
  answers?: unknown;
  score?: number;
  createdAt: string;
}

export interface UserStats {
  totalNotes: number;
  quizzesTaken: number;
  avgScore: number;
  currentStreak: number;
  totalPoints: number;
}

export interface Subscription {
  id: string;
  plan: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "FAILED";
  activatedAt?: string | null;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  createdAt: string;
}

export interface ChatConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

// Admin Types
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  notesCount: number;
  quizzesCount: number;
  attemptsCount: number;
}

export interface UserDetail extends UserSummary {
  emailVerified: boolean;
}

export interface NotePreview {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface QuizPreview {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface AttemptPreview {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  quiz: { title: string };
}

export interface FeedbackData {
  id: string;
  type: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  userEmail: string;
  userName: string;
  activatedAt: string | null;
  user: { id: string; name: string | null; email: string };
}

export interface AffiliateDetail extends Affiliate {
  referrals: AffiliateClick[];
  earnings: AffiliateEarning[];
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

export interface CreateAffiliateParams {
  userId: string;
  code: string;
  momoNumber: string;
  momoName: string;
}

export interface PaymentSettingsData {
  mtnNumber: string;
  mtnHolderName: string;
  orangeNumber: string;
  orangeHolderName: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message?: string;
  error?: string;
}
