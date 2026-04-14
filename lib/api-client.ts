// ===========================================
// API Request Helper - Centralized API Client
// ===========================================

import { privateAxios, publicAxios } from "@/config/axios.config";
import {
  Affiliate,
  AffiliateClick,
  AffiliateEarning,
} from "./generated/prisma/client";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function apiRequest<T>(
  endpoint: string,
  options: {
    method: HttpMethod;
    body?: unknown;
    isPublic?: boolean;
    responseType?: string;
  },
): Promise<T> {
  const axios = options.isPublic ? publicAxios : privateAxios;

  try {
    let response: { data: T };

    if (options.responseType === "blob") {
      const res = await axios.post(endpoint, options.body ?? {}, {
        responseType: "blob",
      });
      return res.data as T;
    }

    switch (options.method) {
      case "GET":
        response = await axios.get<T>(endpoint);
        break;
      case "DELETE":
        response = await axios.delete<T>(endpoint, {
          data: options.body ?? undefined,
        });
        break;
      case "POST":
        response = await axios.post<T>(endpoint, options.body ?? {});
        break;
      case "PUT":
        response = await axios.put<T>(endpoint, options.body ?? {});
        break;
      case "PATCH":
        response = await axios.patch<T>(endpoint, options.body ?? {});
        break;
      default:
        throw new Error(`Invalid HTTP method: ${options.method}`);
    }

    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error("An unexpected error occurred");
  }
}

// ===========================================
// Type Definitions
// ===========================================

interface QuizQuestion {
  id: string;
  type: "MCQ" | "OPEN";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  order: number;
}

interface Quiz {
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

interface NoteSummary {
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

interface NoteWithRelations extends NoteSummary {
  userId: string;
  extractedText?: string | null;
  keyPoints?: string[];
  quizzes: Quiz[];
}

interface UsageData {
  plan: string;
  status: string;
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Post {
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

interface AffiliateData {
  code: string;
  totalClicks: number;
  totalReferrals: number;
  earnings: number;
  pendingPayout: number;
}

interface Feedback {
  id: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
}

interface ExamSession {
  id: string;
  title: string;
  subject: string;
  status: "GENERATING" | "READY" | "COMPLETED";
  questions: unknown[];
  answers?: unknown;
  score?: number;
  createdAt: string;
}

interface UserStats {
  totalNotes: number;
  quizzesTaken: number;
  avgScore: number;
  currentStreak: number;
  totalPoints: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  image?: string | null;
  totalPoints: number;
  quizzesTaken: number;
  avgScore: number;
  rank: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "FAILED";
  activatedAt?: string | null;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  createdAt: string;
}

interface ChatConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

// Admin Types
interface UserSummary {
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

interface UserDetail extends UserSummary {
  emailVerified: boolean;
}

interface UserStats {
  notesCount: number;
  quizzesCount: number;
  attemptsCount: number;
  sessionsCount: number;
  subscriptionsCount: number;
}

interface NotePreview {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

interface QuizPreview {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

interface AttemptPreview {
  id: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  quiz: { title: string };
}

interface FeedbackData {
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

interface SubscriptionData {
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

interface AffiliateDetail extends Affiliate {
  referrals: AffiliateClick[];
  earnings: AffiliateEarning[];
}

interface AdminStats {
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

// ===========================================
// API Client Implementation
// ===========================================

export const api = {
  queries: {
    notes: {
      getAll: () =>
        apiRequest<{ notes: NoteSummary[] }>("/notes", { method: "GET" }),
      getById: (id: string) =>
        apiRequest<{ note: NoteWithRelations }>(`/notes/${id}`, {
          method: "GET",
        }),
    },

    quizzes: {
      getAll: (params: { scope?: string; noteId?: string } = {}) => {
        const searchParams = new URLSearchParams();
        if (params.scope) searchParams.set("scope", params.scope);
        if (params.noteId) searchParams.set("noteId", params.noteId);
        return apiRequest<{ quizzes: Quiz[] }>(
          `/quizzes?${searchParams.toString()}`,
          { method: "GET" },
        );
      },
      getById: (id: string) =>
        apiRequest<{ quiz: Quiz }>(`/quizzes/${id}`, { method: "GET" }),
    },

    usage: () => apiRequest<UsageData>("/usage", { method: "GET" }),

    profile: () =>
      apiRequest<{
        user: UserProfile;
        stats?: UserStats;
        affiliate?: AffiliateData;
      }>("/profile", { method: "GET" }),

    settings: () =>
      apiRequest<{ settings: UserSettings }>("/settings", { method: "GET" }),

    notifications: (unreadOnly = false) =>
      apiRequest<{ notifications: Notification[] }>(
        `/notifications?unread=${unreadOnly}`,
        { method: "GET" },
      ),

    community: {
      getPosts: (params?: {
        subject?: string;
        limit?: number;
        offset?: number;
      }) => {
        const searchParams = new URLSearchParams();
        if (params?.subject) searchParams.set("subject", params.subject);
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.offset) searchParams.set("offset", String(params.offset));
        return apiRequest<{ posts: Post[]; total: number }>(
          `/community/posts?${searchParams.toString()}`,
          { method: "GET" },
        );
      },
      getPost: (id: string) =>
        apiRequest<{ post: Post }>(`/community/posts/${id}`, {
          method: "GET",
        }),
    },

    affiliate: () =>
      apiRequest<{ affiliate: AffiliateData }>("/affiliate", {
        method: "GET",
      }),

    feedback: () =>
      apiRequest<{ feedbacks: Feedback[] }>("/feedback", { method: "GET" }),

    exams: {
      getAll: () =>
        apiRequest<{ exams: ExamSession[] }>("/exams", {
          method: "GET",
        }),
      getById: (id: string) =>
        apiRequest<{ exam: ExamSession }>(`/exams/${id}`, { method: "GET" }),
    },

    stats: {
      userStats: () =>
        apiRequest<{ stats: UserStats }>("/stats", {
          method: "GET",
        }),
      leaderboard: () =>
        apiRequest<{
          leaderboard: LeaderboardEntry[];
          currentUserRank: number | null;
        }>("/leaderboard", { method: "GET" }),
    },

    chat: {
      getConversations: () =>
        apiRequest<{ conversations: ChatConversation[] }>(
          "/chat/conversations",
          { method: "GET" },
        ),
      getConversation: (id: string) =>
        apiRequest<{ conversation: ChatConversationWithMessages }>(
          `/chat/conversations/${id}`,
          { method: "GET" },
        ),
    },

    subscription: () =>
      apiRequest<{ subscription: Subscription | null }>("/subscription", {
        method: "GET",
      }),

    search: (query: string, type = "all") =>
      apiRequest<{ results: unknown[] }>(
        `/search?q=${encodeURIComponent(query)}&type=${type}`,
        { method: "GET" },
      ),
  },

  mutations: {
    notes: {
      create: (data: {
        title: string;
        subject: string;
        fileUrl: string;
        fileName: string;
        fileType: "PDF" | "IMAGE" | "WORD";
      }) =>
        apiRequest<{ note: NoteSummary }>("/notes", {
          method: "POST",
          body: data,
        }),
      update: (id: string, data: { title?: string; subject?: string }) =>
        apiRequest<{ note: NoteSummary }>(`/notes/${id}`, {
          method: "PUT",
          body: data,
        }),
      delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/notes/${id}`, {
          method: "DELETE",
        }),
      process: (noteId: string) =>
        apiRequest<{ success: boolean }>("/notes/process", {
          method: "POST",
          body: { noteId },
        }),
    },

    quizzes: {
      generate: (data: {
        noteId: string;
        questionCount?: number;
        questionTypes?: "MCQ" | "OPEN" | "MIXED";
        timed?: boolean;
        timeLimit?: number;
        isPublic?: boolean;
      }) =>
        apiRequest<{ quiz: Quiz; success: boolean }>("/quizzes/generate", {
          method: "POST",
          body: data,
        }),
      delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/quizzes/${id}`, {
          method: "DELETE",
        }),
      submitAttempt: (data: {
        quizId: string;
        answers: { questionId: string; answer: string }[];
      }) =>
        apiRequest<{
          attempt: unknown;
          pointsEarned: number;
          currentStreak: number;
        }>("/quizzes/attempts", { method: "POST", body: data }),
      getAttempts: (quizId: string) =>
        apiRequest<{ attempts: unknown[] }>(`/quizzes/${quizId}/attempts`, {
          method: "GET",
        }),
      getAttemptById: (attemptId: string) =>
        apiRequest<{ attempt: unknown }>(`/quizzes/attempts/${attemptId}`, {
          method: "GET",
        }),
      getRecentAttempts: (limit?: number) =>
        apiRequest<{ attempts: unknown[] }>(
          `/quizzes/attempts/recent${limit ? `?limit=${limit}` : ""}`,
          { method: "GET" },
        ),
    },

    exams: {
      create: (data: {
        subject: string;
        topic: string;
        questionCount: number;
      }) =>
        apiRequest<{ exam: ExamSession }>("/exams", {
          method: "POST",
          body: data,
        }),
      submit: (examId: string, data: { answers: Record<string, string> }) =>
        apiRequest<{ exam: ExamSession }>(`/exams/${examId}`, {
          method: "PUT",
          body: data,
        }),
    },

    feedback: {
      create: (data: { type: string; message: string; relatedId?: string }) =>
        apiRequest<{ feedback: Feedback }>("/feedback", {
          method: "POST",
          body: data,
        }),
    },

    profile: {
      update: (data: { name?: string; image?: string }) =>
        apiRequest<{ user: UserProfile }>("/profile", {
          method: "PUT",
          body: data,
        }),
    },

    settings: {
      update: (data: {
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        weeklyDigest?: boolean;
      }) =>
        apiRequest<{ settings: UserSettings }>("/settings", {
          method: "PUT",
          body: data,
        }),
    },

    notifications: {
      markRead: (id: string) =>
        apiRequest<{ success: boolean }>(`/notifications/${id}/read`, {
          method: "POST",
        }),
    },

    community: {
      createPost: (data: {
        content: string;
        imageUrl?: string;
        subject?: string;
      }) =>
        apiRequest<{ post: Post }>("/community/posts", {
          method: "POST",
          body: data,
        }),
      deletePost: (id: string) =>
        apiRequest<{ success: boolean }>(`/community/posts/${id}`, {
          method: "DELETE",
        }),
      likePost: (postId: string) =>
        apiRequest<{ success: boolean }>(`/community/posts/${postId}/like`, {
          method: "POST",
        }),
      addComment: (postId: string, data: { content: string }) =>
        apiRequest<{ comment: unknown }>(
          `/community/posts/${postId}/comments`,
          { method: "POST", body: data },
        ),
    },

    affiliate: {
      update: (data: { payoutMethod?: string; payoutAddress?: string }) =>
        apiRequest<{ affiliate: AffiliateData }>("/affiliate", {
          method: "PUT",
          body: data,
        }),
      applyReferral: (code: string) =>
        apiRequest<{ success: boolean }>("/referral", {
          method: "POST",
          body: { code },
        }),
    },

    chat: {
      createConversation: () =>
        apiRequest<{ conversation: ChatConversation }>("/chat/conversations", {
          method: "POST",
        }),
      updateConversation: (id: string, data: { title: string }) =>
        apiRequest<{ success: boolean }>(`/chat/conversations/${id}`, {
          method: "PATCH",
          body: data,
        }),
      deleteConversation: (id: string) =>
        apiRequest<{ success: boolean }>(`/chat/conversations/${id}`, {
          method: "DELETE",
        }),
      addMessage: (data: {
        conversationId: string;
        role: string;
        content: string;
        parts: unknown[];
      }) =>
        apiRequest<{ message: ChatMessage }>("/chat/messages", {
          method: "POST",
          body: data,
        }),
    },

    // Admin APIs
    admin: {
      // Users
      users: {
        getAll: (
          params: {
            page?: number;
            limit?: number;
            search?: string;
            role?: string;
            sortBy?: string;
            sortOrder?: string;
          } = {},
        ) => {
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.set("page", params.page.toString());
          if (params.limit) searchParams.set("limit", params.limit.toString());
          if (params.search) searchParams.set("search", params.search);
          if (params.role) searchParams.set("role", params.role);
          if (params.sortBy) searchParams.set("sortBy", params.sortBy);
          if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
          return apiRequest<{
            users: UserSummary[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/admin/users?${searchParams.toString()}`, { method: "GET" });
        },
        getById: (id: string) =>
          apiRequest<{
            user: UserDetail;
            stats: UserStats;
            recentNotes: NotePreview[];
            recentQuizzes: QuizPreview[];
            recentAttempts: AttemptPreview[];
          }>(`/admin/users/${id}`, { method: "GET" }),
        update: (id: string, data: { name?: string; role?: string }) =>
          apiRequest<{ user: UserSummary; success: boolean }>(
            `/admin/users/${id}`,
            { method: "PUT", body: data },
          ),
        delete: (id: string) =>
          apiRequest<{ success: boolean }>(`/admin/users/${id}`, {
            method: "DELETE",
          }),
      },
      // Feedback
      feedback: {
        getAll: (
          params: { page?: number; limit?: number; status?: string } = {},
        ) => {
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.set("page", params.page.toString());
          if (params.limit) searchParams.set("limit", params.limit.toString());
          if (params.status) searchParams.set("status", params.status);
          return apiRequest<{
            feedbacks: FeedbackData[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/admin/feedback?${searchParams.toString()}`, { method: "GET" });
        },
        getById: (id: string) =>
          apiRequest<{ feedback: FeedbackData }>(`/admin/feedback/${id}`, {
            method: "GET",
          }),
        update: (id: string, data: { status?: string; adminNote?: string }) =>
          apiRequest<{ feedback: FeedbackData; success: boolean }>(
            `/admin/feedback`,
            { method: "PUT", body: { id, ...data } },
          ),
        delete: (id: string) =>
          apiRequest<{ success: boolean }>(`/admin/feedback/${id}`, {
            method: "DELETE",
          }),
      },
      // Subscriptions
      subscriptions: {
        getAll: (
          params: { page?: number; limit?: number; status?: string } = {},
        ) => {
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.set("page", params.page.toString());
          if (params.limit) searchParams.set("limit", params.limit.toString());
          if (params.status) searchParams.set("status", params.status);
          return apiRequest<{
            subscriptions: SubscriptionData[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/admin/subscriptions?${searchParams.toString()}`, {
            method: "GET",
          });
        },
        getById: (id: string) =>
          apiRequest<{ subscription: SubscriptionData }>(
            `/admin/subscriptions/${id}`,
            { method: "GET" },
          ),
        update: (id: string, data: { status: string }) =>
          apiRequest<{ subscription: SubscriptionData; success: boolean }>(
            `/admin/subscriptions/${id}`,
            { method: "PUT", body: data },
          ),
        create: (data: {
          userId: string;
          plan: string;
          amount: number;
          startDate: string;
          endDate: string;
        }) =>
          apiRequest<{ subscription: SubscriptionData; success: boolean }>(
            "/admin/subscriptions",
            { method: "POST", body: data },
          ),
        delete: (id: string) =>
          apiRequest<{ success: boolean }>(`/admin/subscriptions/${id}`, {
            method: "DELETE",
          }),
      },
      // Affiliates
      affiliates: {
        getAll: (
          params: { page?: number; limit?: number; status?: string } = {},
        ) => {
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.set("page", params.page.toString());
          if (params.limit) searchParams.set("limit", params.limit.toString());
          if (params.status) searchParams.set("status", params.status);
          return apiRequest<{
            affiliates: AffiliateData[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/admin/affiliates?${searchParams.toString()}`, { method: "GET" });
        },
        getById: (id: string) =>
          apiRequest<{ affiliate: AffiliateDetail; totalEarnings: number }>(
            `/admin/affiliates/${id}`,
            { method: "GET" },
          ),
        update: (
          id: string,
          data: { status?: string; commissionRate?: number },
        ) =>
          apiRequest<{ affiliate: AffiliateData; success: boolean }>(
            `/admin/affiliates/${id}`,
            { method: "PUT", body: data },
          ),
        create: (data: {
          userId: string;
          code: string;
          commissionRate?: number;
          status?: string;
        }) =>
          apiRequest<{ affiliate: AffiliateData; success: boolean }>(
            "/admin/affiliates",
            { method: "POST", body: data },
          ),
        delete: (id: string) =>
          apiRequest<{ success: boolean }>(`/admin/affiliates/${id}`, {
            method: "DELETE",
          }),
      },
      // Stats
      stats: () =>
        apiRequest<{ stats: AdminStats }>("/admin/stats", { method: "GET" }),
      // Reports (PDF)
      generateReport: (type: string, filters?: Record<string, unknown>) =>
        apiRequest<Blob>(`/admin/reports`, {
          method: "POST",
          body: { type, filters },
          responseType: "blob",
        }),
    },
  },
};
