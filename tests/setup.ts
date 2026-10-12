import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
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
    json: (data: unknown, init?: ResponseInit) => ({
      ok: !init || (init.status >= 200 && init.status < 300),
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      headers: new Headers(init?.headers),
    }),
    redirect: (url: string) => ({
      ok: true,
      status: 302,
      headers: new Headers({ Location: url }),
    }),
    next: () => ({ ok: true, status: 200 }),
  },
  NextRequest: class {
    constructor(public url: string, public init?: RequestInit) {}
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
    note: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    quiz: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    quizAttempt: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    quizQuestion: { createMany: vi.fn() },
    subscription: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    affiliate: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    affiliateEarning: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    creditPurchaseOrder: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    creditTransaction: { findFirst: vi.fn(), create: vi.fn() },
    userStats: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    chatConversation: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    chatMessage: { findMany: vi.fn(), create: vi.fn() },
    knowledgeChunk: { findMany: vi.fn() },
    topic: { findMany: vi.fn() },
    component: { findUnique: vi.fn() },
    paper3Source: { findUnique: vi.fn(), update: vi.fn() },
    paper3Mock: { findUnique: vi.fn() },
    paper3MockAttempt: { findUnique: vi.fn() },
    paper3Question: { findMany: vi.fn() },
    paper3QuestionAttempt: { findMany: vi.fn() },
    paper3UserStats: { findFirst: vi.fn() },
    $transaction: vi.fn((fn) => fn(vi.mocked(prisma))),
  },
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
  ajRateLimit: { protect: vi.fn(() => Promise.resolve({ isDenied: () => false })) },
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
  getPlatformSettings: vi.fn(() => Promise.resolve({
    creditCostQuizGeneration: 10,
    creditCostAiTutorMessage: 5,
  })),
  quizCreditsRequired: vi.fn(() => false),
  creditEnforcementEffective: vi.fn(() => ({ aiTutor: false })),
}));

vi.mock("@/lib/chat-usage", () => ({
  getChatResetWindow: vi.fn(() => ({ nextResetAt: new Date(), windowStart: new Date() })),
}));

vi.mock("@/lib/exam-profile", () => ({
  getActiveProfileId: vi.fn(() => Promise.resolve("profile-id")),
}));

vi.mock("@/lib/readiness", () => ({
  computeReadiness: vi.fn(() => Promise.resolve({
    readiness: 75,
    programReadiness: [],
    topicReadiness: [],
    weakestTopic: null,
    strongestTopic: null,
    daysUntilExam: 30,
    highRisk: false,
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
  initiatePayment: vi.fn(() => Promise.resolve({ success: true, redirectUrl: "http://test.com" })),
  verifyPayment: vi.fn(() => Promise.resolve({ status: "SUCCESSFUL" })),
}));

vi.mock("@/lib/uploadthing-server", () => ({
  utapi: {
    getFileUrls: vi.fn(() => Promise.resolve({ data: [{ url: "https://test.ufs.sh/file.pdf", key: "test-key" }] })),
    deleteFiles: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock("@/lib/ai", () => ({
  extractTextFromPDF: vi.fn(() => Promise.resolve("test content")),
  extractTextFromImage: vi.fn(() => Promise.resolve("test content")),
  extractTextFromWord: vi.fn(() => Promise.resolve("test content")),
  summarizeText: vi.fn(() => Promise.resolve({ summary: "summary", topics: [], keyPoints: [] })),
  generateQuizFromNote: vi.fn(() => Promise.resolve([])),
  generateQuizFromWeakAreas: vi.fn(() => Promise.resolve([])),
  generateQuizFromTopic: vi.fn(() => Promise.resolve([])),
  normalizeGeneratedQuestions: vi.fn((q) => q),
  DEFAULT_QUIZ_TOPICS: ["topic1", "topic2"],
}));

vi.mock("@/lib/paper3/evaluate", () => ({
  evaluatePaper3Exam: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/paper3/grade-short-answer", () => ({
  gradeShortAnswer: vi.fn(() => Promise.resolve({ isCorrect: true, marksEarned: 5, totalMarks: 5, feedback: "Good" })),
}));

vi.mock("@/tavily/core", () => ({
  tavily: vi.fn(() => ({
    search: vi.fn(() => Promise.resolve({ results: [], answer: "" })),
  })),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => ({ modelId: "gemini-2.5-flash" })),
}));

vi.mock("@tavily/core", () => ({
  tavily: vi.fn(() => ({
    search: vi.fn(() => Promise.resolve({ results: [], answer: "" })),
  })),
}));