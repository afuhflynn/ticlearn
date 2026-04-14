// TiCLearn Type Definitions

import type {
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

export interface NoteWithRelations {
  id: string;
  userId: string;
  title: string;
  subject: string;
  fileUrl: string;
  uploadthingKey: string | null;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "WORD";
  extractedText: string | null;
  topics: string[];
  keyPoints: string[];
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
  uploadthingKey?: string | null;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "WORD";
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  topics?: string[];
  keyPoints?: string[];
  summary?: string | null;
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
// FAQ Types
// ===========================================

export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is TiCLearn?",
    answer:
      "TiCLearn is an AI-powered study platform designed specifically for Cameroonian GCE A-Level students. It helps you transform notes into quizzes, practice with past exams, compete on leaderboards, and get help from an TiC.",
  },
  {
    question: "How does the AI quiz generator work?",
    answer:
      "Simply upload your study notes or paste text, and our AI will automaTiClly generate relevant multiple-choice quizzes. You can customize the number of questions, difficulty level, and topics covered.",
  },
  {
    question: "Is TiCLearn free to use?",
    answer:
      "Yes! TiCLearn offers a free tier with basic features including note uploading, quiz generation, and access to the TiC. We also offer premium plans with advanced features like unlimited quizzes, exam papers, and priority support.",
  },
  {
    question: "What subjects do you support?",
    answer:
      "We support all GCE A-Level subjects including Mathematics, Physics, Chemistry, Biology, Computer Science, Economics, Geography, Literature, and more. Our AI is continuously learning to improve accuracy across all subjects.",
  },
  {
    question: "How do I subscribe to premium?",
    answer:
      "Visit our pricing page to view available plans. Subscriptions can be paid via Fapshi (mobile money) or credit card. Once subscribed, you'll get instant access to all premium features.",
  },
  {
    question: "Can I use TiCLearn on my phone?",
    answer:
      "Yes! TiCLearn is fully responsive and works on desktop, tablet, and mobile devices. You can study anywhere, anytime.",
  },
  {
    question: "How does the affiliate program work?",
    answer:
      "Share your unique referral link with friends and earn rewards when they subscribe. You'll earn 20% of their subscription fees for life. Track your earnings in your dashboard.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We take data privacy seriously. Your notes and study data are encrypted and stored securely. We never share your personal information with third parties.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Go to the sign-in page and click 'Forgot Password'. Enter your email address and we'll send you a reset link.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
  {
    question: "How can I contact support?",
    answer:
      "You can reach us via email at hello@ticlearn.com, use our contact form, or send a message through the app. We typically respond within 24 hours.",
  },
  {
    question: "Do you offer group/school subscriptions?",
    answer:
      "Yes! We offer special pricing for schools and organizations. Contact us at hello@ticlearn.com for more information.",
  },
];

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
