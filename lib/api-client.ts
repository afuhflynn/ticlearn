// ===========================================
// API Request Helper - Centralized API Client
// ===========================================

import { isAxiosError } from "axios";

import { privateAxios, publicAxios } from "@/config/axios.config";
import type {
  AdminStats,
  AffiliateData,
  AffiliateDetail,
  AttemptPreview,
  ChatConversation,
  ChatConversationWithMessages,
  ChatMessage,
  CreateAffiliateParams,
  NotePreview,
  NoteSummary,
  NoteWithRelations,
  PaymentSettingsData,
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

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * The request never reached the server. The device is offline, the network is
 * down, or the request timed out on its way out. A screen that shows this
 * says the connection dropped, because the answer was never lost, it was
 * never asked for.
 */
export class NetworkError extends Error {
  constructor(message = "The connection dropped before the server answered.") {
    super(message);
    this.name = "NetworkError";
  }
}

/** True when the failure was a request that never got an answer. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError;
}

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
    // A request that never got a response is a lost connection, and it is
    // told apart from a server that said no. Without this the student is
    // shown a generic error for a network that is simply not there.
    if (isAxiosError(error) && error.response === undefined) {
      throw new NetworkError();
    }
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

    retries: {
      getByAnswer: (answerId: string) =>
        apiRequest<{ retry: unknown }>(
          `/retries?answerId=${encodeURIComponent(answerId)}`,
          { method: "GET" },
        ),
    },

    usage: () => apiRequest<UsageData>("/usage", { method: "GET" }),

    plans: () =>
      apiRequest<{
        tiers: Array<{
          key: string;
          label: string;
          priceXaf: number;
          period: string;
          periodDays: number | null;
          semesterMonths: number | null;
          credits: number;
          features: string[];
          cta: string;
          popular: boolean;
          notForSale: boolean;
          limits: {
            pdfUploads: number;
            quizGenerations: number;
            aiTutorMessages: number;
            maxConversationMessages: number;
          };
        }>;
      }>("/plans", { method: "GET", isPublic: true }),

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

    payments: {
      settings: () =>
        apiRequest<{ settings: PaymentSettingsData }>(
          "/admin/payment-settings",
          {
            method: "GET",
          },
        ),
      status: (transId: string) =>
        apiRequest<{
          kind?: "pass" | "credits";
          status: string;
          plan?: string;
          transId?: string;
          providerStatus?: string | null;
          next?: string;
          pollHint?: string;
          paidAt?: string | null;
          credits?: number;
          amount?: number;
        }>(`/payment/status?transId=${encodeURIComponent(transId)}`, {
          method: "GET",
        }),
    },

    stats: {
      userStats: () =>
        apiRequest<{ stats: UserStats }>("/stats", {
          method: "GET",
        }),
    },

    dashboard: {
      continue: () =>
        apiRequest<{
          recentNotes: Array<{
            id: string;
            title: string;
            fileName: string;
            status: string;
            createdAt: string;
          }>;
          lastAttempt: {
            attemptId: string;
            quizId: string | null;
            title: string;
            answeredAt: string;
          } | null;
        }>("/dashboard/continue", { method: "GET" }),
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
            note: { id: string; title: string } | null;
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

    conversion: () =>
      apiRequest<{
        range: { start: string; end: string };
        byEvent: Record<string, number>;
        paid: number;
      }>("/admin/conversion", { method: "GET" }),

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
        fileUrl: string;
        fileName: string;
        fileType: "PDF" | "IMAGE" | "WORD";
      }) =>
        apiRequest<{ note: NoteSummary }>("/notes", {
          method: "POST",
          body: data,
        }),
      update: (id: string, data: { title?: string }) =>
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
        source?: "page" | "chat";
        conversationId?: string;
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
        source?: "page" | "chat";
        conversationId?: string;
        clientRunId?: string;
      }) =>
        apiRequest<{
          attempt: unknown;
          pointsEarned: number;
          currentStreak: number;
          duplicate?: boolean;
        }>("/quizzes/attempts", { method: "POST", body: data }),
      getAttempts: (quizId: string) =>
        apiRequest<{ attempts: unknown[] }>(`/quizzes/${quizId}/attempts`, {
          method: "GET",
        }),
      getAttemptById: (attemptId: string) =>
        apiRequest<{ attempt: unknown }>(`/quizzes/attempts/${attemptId}`, {
          method: "GET",
        }),
      grade: (data: {
        questionId: string;
        question: string;
        type: "MCQ" | "OPEN";
        userAnswer: string;
        correctAnswer: string;
        options?: string[];
      }) =>
        apiRequest<{
          questionId: string;
          isCorrect: boolean;
          why: string;
        }>("/quizzes/grade", { method: "POST", body: data }),
      getRecentAttempts: (limit?: number) =>
        apiRequest<{ attempts: unknown[] }>(
          `/quizzes/attempts/recent${limit ? `?limit=${limit}` : ""}`,
          { method: "GET" },
        ),
    },

    retries: {
      create: (answerId: string) =>
        apiRequest<{ retry: unknown }>("/retries", {
          method: "POST",
          body: { answerId },
        }),
      submit: (id: string, userAnswer: string) =>
        apiRequest<{ isCorrect: boolean; correctAnswer: string }>(
          `/retries/${id}/submit`,
          { method: "POST", body: { userAnswer } },
        ),
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
      initiatePass: (data: { plan: string; phone: string; provider: string }) =>
        apiRequest<{ link: string; transId: string; status: string }>(
          "/payment/initiate",
          { method: "POST", body: data },
        ),
      initiateCredits: (data: {
        amountXaf: number;
        phone: string;
        provider: string;
      }) =>
        apiRequest<{
          link: string;
          transId: string;
          orderId: string;
          creditsPromised: number;
          amountXaf: number;
        }>("/credits/purchase/initiate", { method: "POST", body: data }),
    },

    prompts: {
      record: (data: {
        event:
          | "limit_hit"
          | "prompt_shown"
          | "prompt_clicked"
          | "prompt_dismissed"
          | "upgrade_start";
        surface: "quiz" | "tip" | "note";
        kind?: string;
        used?: number;
        cap?: number;
        metadata?: Record<string, unknown>;
      }) =>
        apiRequest<{ ok: boolean; deduped?: boolean }>("/prompts/event", {
          method: "POST",
          body: data,
        }),
    },

    affiliate: {
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
      createConversation: (noteId?: string) =>
        apiRequest<{ conversation: ChatConversation }>("/chat/conversations", {
          method: "POST",
          body: noteId ? { noteId } : undefined,
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

      // Plan Upgrades
      planUpgrades: {
        getAll: (
          params: {
            page?: number;
            limit?: number;
            search?: string;
            role?: string;
            onboardingStatus?: string;
            plan?: string;
            subscriptionStatus?: string;
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
          if (params.plan) searchParams.set("plan", params.plan);
          if (params.subscriptionStatus) {
            searchParams.set("subscriptionStatus", params.subscriptionStatus);
          }
          if (params.sortBy) searchParams.set("sortBy", params.sortBy);
          if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
          return apiRequest<{
            users: unknown[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          }>(`/admin/plan-upgrades?${searchParams.toString()}`, {
            method: "GET",
          });
        },
        updatePlan: (data: { userId: string; plan: string; reason?: string }) =>
          apiRequest<{ success: boolean; user: unknown }>(
            "/admin/plan-upgrades",
            { method: "PATCH", body: data },
          ),
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
        invites: (
          params: {
            page?: number;
            limit?: number;
            status?: string;
            search?: string;
          } = {},
        ) => {
          const sp = new URLSearchParams();
          if (params.page) sp.set("page", String(params.page));
          if (params.limit) sp.set("limit", String(params.limit));
          if (params.status) sp.set("status", params.status);
          if (params.search) sp.set("search", params.search);
          return apiRequest<{
            invites: {
              id: string;
              email: string;
              status: string;
              expiresAt: string;
              createdAt: string;
            }[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/admin/affiliates/invites?${sp.toString()}`, { method: "GET" });
        },
        inviteCreate: (data: { email: string }) =>
          apiRequest<{
            success: boolean;
            invite: {
              id: string;
              email: string;
              status: string;
              expiresAt: string;
            };
          }>("/admin/affiliates/invites", { method: "POST", body: data }),
        inviteApprove: (id: string) =>
          apiRequest<{
            success: boolean;
            affiliate: { id: string; status: string };
          }>(`/admin/affiliates/invites/${id}/approve`, { method: "POST" }),
        inviteResend: (id: string) =>
          apiRequest<{
            success: boolean;
            invite: { id: string; expiresAt: string };
          }>(`/admin/affiliates/invites/${id}/resend`, { method: "POST" }),
        inviteRevoke: (id: string) =>
          apiRequest<{ success: boolean; status: string }>(
            `/admin/affiliates/invites/${id}/revoke`,
            { method: "POST" },
          ),
        payout: (id: string, data: { payoutReference: string }) =>
          apiRequest<{ success: boolean; message: string; amountPaid: number }>(
            `/admin/affiliates/${id}/payout`,
            { method: "POST", body: data },
          ),
        revoke: (id: string, data: { reason: string }) =>
          apiRequest<{ success: boolean; status: string }>(
            `/admin/affiliates/${id}/revoke`,
            { method: "POST", body: data },
          ),
      },
      partner: {
        me: () =>
          apiRequest<{
            code: string;
            link: string;
            clicks: number;
            conversions: number;
            pending: number;
            lifetime: number;
            status: string;
          }>("/affiliates/me", { method: "GET" }),
        claim: (token: string) =>
          apiRequest<{
            success: boolean;
            affiliate: { id: string; status: string; code: string };
          }>("/affiliates/claim", { method: "POST", body: { token } }),
        requestPayout: () =>
          apiRequest<{ success: boolean; requested: number }>(
            "/affiliates/payout-requests",
            { method: "POST" },
          ),
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
