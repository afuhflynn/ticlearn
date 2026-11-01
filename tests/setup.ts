import "@testing-library/jest-dom";
import { vi } from "vitest";

// The AI layer refuses to build a provider without a key. Tests never make a
// real call, so a placeholder keeps that guard honest instead of stubbed out.
process.env.OPENROUTER_API_KEY ??= "test-openrouter-key";
process.env.MUSE_API_KEY ??= "test-muse-key";

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).slice(2)}`,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({ getAll: () => [], get: () => undefined })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => {
      const status = init?.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
        headers: new Headers(init?.headers),
      };
    },
    redirect: (url: string) => ({
      ok: true,
      status: 302,
      headers: new Headers({ Location: url }),
    }),
    next: () => ({ ok: true, status: 200 }),
  },
  NextRequest: class {
    constructor(
      public url: string,
      public init?: RequestInit,
    ) {}
    headers = new Headers();
    nextUrl = new URL(this.url);
    method = this.init?.method || "GET";
    json = () => Promise.resolve({});
    clone = () => new Request(this.url, this.init);
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    note: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    appCache: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    webSearchEvent: {
      create: vi.fn(async () => ({ id: "web-search-event-1" })),
      update: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    quiz: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    quizAttempt: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    quizQuestion: { createMany: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
      aggregate: vi.fn(async () => ({ _sum: { amount: 0 } })),
    },
    kpiEvent: {
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: "kpi-1" })),
      groupBy: vi.fn(async () => []),
    },
    planOverride: { findMany: vi.fn(async () => []) },
    affiliate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    affiliateEarning: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    creditPurchaseOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    creditTransaction: { findFirst: vi.fn(), create: vi.fn() },
    userStats: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    chatConversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    chatMessage: { findMany: vi.fn(), create: vi.fn() },
    knowledgeChunk: { findMany: vi.fn() },
    topic: { findMany: vi.fn() },
    component: { findUnique: vi.fn() },
    platformSettings: { findUnique: vi.fn(async () => null) },
    aiModelHealth: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
    aiUsageEvent: {
      create: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({
        _sum: { costXaf: null, promptTokens: null, completionTokens: null },
        _count: { id: 0 },
      })),
      groupBy: vi.fn(async () => []),
    },
    university: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    faculty: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    course: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    $transaction: vi.fn(async (fn: any) => fn({})),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  limit: vi.fn(async () => null),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

vi.mock("@/lib/arcjet", () => ({
  aj: { protect: vi.fn(() => Promise.resolve({ isDenied: () => false })) },
  ajRateLimit: {
    protect: vi.fn(() => Promise.resolve({ isDenied: () => false })),
  },
  ajAuth: { protect: vi.fn(() => Promise.resolve({ isDenied: () => false })) },
  ajAI: { protect: vi.fn(() => Promise.resolve({ isDenied: () => false })) },
  protect: vi.fn(() => Promise.resolve({ isDenied: () => false })),
}));

vi.mock("@/lib/credits", () => ({
  getUserCreditBalance: vi.fn(() => Promise.resolve(1000)),
  spendCredits: vi.fn(() => Promise.resolve({ success: true })),
  getEffectiveCreditCost: vi.fn(() => 10),
  grantCredits: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/platform-settings", () => ({
  getPlatformSettings: vi.fn(() =>
    Promise.resolve({
      creditCostQuizGeneration: 10,
      creditCostAiTutorMessage: 5,
    }),
  ),
  quizCreditsRequired: vi.fn(() => false),
  creditEnforcementEffective: vi.fn(() => ({ aiTutor: false })),
}));

vi.mock("@/lib/chat-usage", () => ({
  getChatResetWindow: vi.fn(() => ({
    nextResetAt: new Date(),
    windowStart: new Date(),
  })),
}));

vi.mock("@/lib/kpi", () => ({
  trackEvent: vi.fn(() => Promise.resolve()),
  EVENTS: {},
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn(() => Promise.resolve()) },
}));

vi.mock("@/lib/inngest/functions", () => ({
  processNote: { name: "Process Note" },
  generateQuiz: { name: "Generate Quiz" },
  sendVerificationEmail: { name: "Send Verification Email" },
  sendWelcomeEmail: { name: "Send Welcome Email" },
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
  sendSignInEmail: vi.fn(() => Promise.resolve()),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
  sendAdminInvitationEmail: vi.fn(() => Promise.resolve()),
  sendRoleUpdateEmail: vi.fn(() => Promise.resolve()),
  sendUnverifiedWarningEmail: vi.fn(() => Promise.resolve()),
  sendSubscriptionActivatedEmail: vi.fn(() => Promise.resolve()),
  sendSubscriptionRejectedEmail: vi.fn(() => Promise.resolve()),
  sendPaymentSuccessEmail: vi.fn(() => Promise.resolve()),
  sendPaymentFailedEmail: vi.fn(() => Promise.resolve()),
  sendAdminPaymentAlert: vi.fn(() => Promise.resolve()),
  sendPlatformUpdateEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/fapshi", () => ({
  initiatePayment: vi.fn(() =>
    Promise.resolve({ success: true, redirectUrl: "http://test.com" }),
  ),
  verifyPayment: vi.fn(() => Promise.resolve({ status: "SUCCESSFUL" })),
}));

vi.mock("@/lib/uploadthing-server", () => ({
  utapi: {
    getFileUrls: vi.fn(() =>
      Promise.resolve({
        data: [{ url: "https://test.ufs.sh/file.pdf", key: "test-key" }],
      }),
    ),
    deleteFiles: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock("@/lib/ai", () => ({
  extractTextFromPDF: vi.fn(() => Promise.resolve("test content")),
  extractTextFromImage: vi.fn(() => Promise.resolve("test content")),
  extractTextFromWord: vi.fn(() => Promise.resolve("test content")),
  summarizeText: vi.fn(() =>
    Promise.resolve({ summary: "summary", topics: [], keyPoints: [] }),
  ),
  generateQuizFromNote: vi.fn(() =>
    Promise.resolve({ questions: [], fromCache: false }),
  ),
  generateQuizFromWeakAreas: vi.fn(() => Promise.resolve([])),
  generateQuizFromTopic: vi.fn(() => Promise.resolve([])),
  normalizeGeneratedQuestions: vi.fn((q) => q),
  DEFAULT_QUIZ_TOPICS: ["topic1", "topic2"],
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => ({ modelId: "gemini-2.5-flash" })),
}));
