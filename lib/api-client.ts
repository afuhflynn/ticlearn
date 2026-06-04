// ===========================================
// API Request Helper - Centralized API Client
// ===========================================

import { privateAxios, publicAxios } from "@/config/axios.config";
import type {
  AdminStats,
  AffiliateData,
  AffiliateDetail,
  AttemptPreview,
  ChatConversation,
  ChatConversationWithMessages,
  ChatMessage,
  ContactFormData,
  ContactResponse,
  CreateAffiliateParams,
  ExamSession,
  Feedback,
  FeedbackData,
  LeaderboardEntry,
  NotePreview,
  NoteSummary,
  NoteWithRelations,
  PaymentSettingsData,
  Post,
  Quiz,
  QuizPreview,
  Subscription,
  SubscriptionData,
  UsageData,
  UserDetail,
  UserProfile,
  UserSettings,
  UserStats,
  UserSummary,
} from "@/types";
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

    credits: () =>
      apiRequest<{
        balance: number;
        totalEarned: number;
        earned: number;
        spent: number;
        referralCode: string | null;
        transactions: Array<{
          id: string;
          amount: number;
          type: string;
          description: string | null;
          referenceId: string | null;
          createdAt: string;
        }>;
      }>("/credits", { method: "GET" }),

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

    affiliates: {
      affiliate: () =>
        apiRequest<{ affiliate: AffiliateData }>("/affiliate", {
          method: "GET",
        }),
    },

    payments: {
      settings: () =>
        apiRequest<{ settings: PaymentSettingsData }>(
          "/admin/payment-settings",
          {
            method: "GET",
          },
        ),
    },

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
      leaderboard: (page = 1, limit = 20) =>
        apiRequest<{
          leaderboard: LeaderboardEntry[];
          currentUserRank: number | null;
          total: number;
          totalPages: number;
          page: number;
        }>(`/leaderboard?page=${page}&limit=${limit}`, { method: "GET" }),
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
      getMessages: (id: string, cursor?: string | null, limit = 30) =>
        apiRequest<{
          conversation: {
            id: string;
            title: string;
            createdAt: string;
            updatedAt: string;
            summary: string | null;
          };
          messages: ChatMessage[];
          nextCursor: string | null;
        }>(
          `/chat/conversations/${id}?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
          { method: "GET" },
        ),
    },

    subscription: () =>
      apiRequest<{
        subscription: Subscription | null;
        previousPlan: string | null;
      }>("/subscription/me", {
        method: "GET",
      }),

    search: (query: string, type = "all") =>
      apiRequest<{ results: unknown[] }>(
        `/search?q=${encodeURIComponent(query)}&type=${type}`,
        { method: "GET" },
      ),

    invites: {
      accept: (data: { token: string }) =>
        apiRequest<{ message: string | null } | { error: string | null }>(
          `/admin/invites/accept$`,
          {
            method: "POST",
            body: { token: data.token },
          },
        ),
    },
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
      generateFromWeakAreas: (data: {
        questionCount?: number;
        timed?: boolean;
        timeLimit?: number;
        isPublic?: boolean;
      }) =>
        apiRequest<{
          quizId: string;
          status: string;
          creditsUsed: number;
          weakAreasTargeted: string[];
          message: string;
        }>("/quizzes/generate/from-weak-areas", {
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
      create: (data: { type: string; subject: string; message: string }) =>
        apiRequest<{ feedback: Feedback }>("/feedback", {
          method: "POST",
          body: data,
        }),
    },

    contact: {
      send: (data: ContactFormData) =>
        apiRequest<ContactResponse>("/contact", {
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
    payments: {
      updateSettings: (data: PaymentSettingsData) =>
        apiRequest<{ error: string | null } | { message: string | null }>(
          "/admin/payment-settings",
          {
            method: "PUT",
            body: data,
          },
        ),
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
      update: (data: { momoNumber?: string; momoName?: string }) =>
        apiRequest<{ affiliate: AffiliateData }>("/affiliate", {
          method: "PUT",
          body: data,
        }),
      applyReferral: (code: string) =>
        apiRequest<{ success: boolean }>("/referral", {
          method: "POST",
          body: { code },
        }),
      requestPayout: () =>
        apiRequest<{ success: boolean; message: string; amount: number }>(
          "/affiliate/payout",
          {
            method: "POST",
          },
        ),

      create: (data: CreateAffiliateParams) =>
        apiRequest<{ success: boolean; message: string; amount: number }>(
          "/admin/affiliates",
          {
            method: "POST",
            body: data,
          },
        ),
      confirmEarnings: (payEarningsId: string) =>
        apiRequest<{ success: boolean; message: string; amount: number }>(
          `/admin/affiliates/${payEarningsId}/payout`,
          {
            method: "POST",
          },
        ),
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
            onboardingStatus?:
              | "completed"
              | "not_completed"
              | "skipped"
              | "all";
            sortBy?: string;
            sortOrder?: string;
          } = {},
        ) => {
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.set("page", params.page.toString());
          if (params.limit) searchParams.set("limit", params.limit.toString());
          if (params.search) searchParams.set("search", params.search);
          if (params.role) searchParams.set("role", params.role);
          if (params.onboardingStatus) {
            searchParams.set("onboardingStatus", params.onboardingStatus);
          }
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
        search: (search: string) =>
          apiRequest<{
            users: UserSummary[];
            total: number;
            page: number;
            totalPages: number;
          }>("/admin/users", {
            method: "POST",
            body: { search },
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
      // Metrics / Analytics
      metrics: {
        getAll: (params?: {
          from?: string;
          to?: string;
          tab?: string;
          granularity?: string;
          metric?: string;
          page?: number;
          limit?: number;
          sort?: string;
          order?: string;
          search?: string;
        }) => {
          const sp = new URLSearchParams();
          if (params?.from) sp.set("from", params.from);
          if (params?.to) sp.set("to", params.to);
          if (params?.tab) sp.set("tab", params.tab);
          if (params?.granularity) sp.set("granularity", params.granularity);
          if (params?.metric) sp.set("metric", params.metric);
          if (params?.page) sp.set("page", String(params.page));
          if (params?.limit) sp.set("limit", String(params.limit));
          if (params?.sort) sp.set("sort", params.sort);
          if (params?.order) sp.set("order", params.order);
          if (params?.search) sp.set("search", params.search);
          return apiRequest<Record<string, unknown>>(
            `/admin/metrics?${sp.toString()}`,
            { method: "GET" },
          );
        },
        recalculate: (date?: string) =>
          apiRequest<{ computed: { metric: string; value: number }[] }>(
            "/admin/metrics",
            { method: "PUT", body: { date: date || new Date().toISOString() } },
          ),
        export: (params?: { from?: string; to?: string; metrics?: string }) => {
          const sp = new URLSearchParams();
          if (params?.from) sp.set("from", params.from);
          if (params?.to) sp.set("to", params.to);
          if (params?.metrics) sp.set("metrics", params.metrics);
          return apiRequest<Blob>(`/admin/metrics/export?${sp.toString()}`, {
            method: "GET",
            responseType: "blob",
          });
        },
        retention: (granularity?: string) => {
          const sp = new URLSearchParams();
          if (granularity) sp.set("granularity", granularity);
          return apiRequest<{ retention: unknown[]; granularity: string }>(
            `/admin/metrics/retention?${sp.toString()}`,
            { method: "GET" },
          );
        },
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
