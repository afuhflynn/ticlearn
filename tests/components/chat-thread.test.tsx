import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThread } from "@/components/chat/chat-thread";

const useChatMock = vi.hoisted(() => vi.fn());
const useMessagesPaginatedMock = vi.hoisted(() => vi.fn());
const useUsageMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() => vi.fn());
const backupReadMock = vi.hoisted(() => vi.fn());
const backupSaveMock = vi.hoisted(() => vi.fn());
const backupClearMock = vi.hoisted(() => vi.fn());

vi.mock("@ai-sdk/react", () => ({
  useChat: useChatMock,
}));

vi.mock("@/hooks", () => ({
  useMessagesPaginated: useMessagesPaginatedMock,
  useUsage: useUsageMock,
}));

vi.mock("@/hooks/useChat", () => ({
  useMessagesPaginated: useMessagesPaginatedMock,
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    mutations: {
      chat: {
        saveRunBackup: backupSaveMock,
        readRunBackup: backupReadMock,
        clearRunBackup: backupClearMock,
      },
    },
    queries: {},
  },
}));

vi.mock("@/components/chat/quiz-runner", () => ({
  QuizRunner: ({
    conversationId,
    noteId,
    noteTitle,
  }: {
    conversationId: string;
    noteId: string | null;
    noteTitle: string | null;
  }) => (
    <div
      data-testid="quiz-runner"
      data-conversation={conversationId}
      data-note={noteId ?? ""}
      data-title={noteTitle ?? ""}
    />
  ),
}));

vi.mock("@/components/chat/chat-message-list", () => ({
  ChatMessageList: () => <div data-testid="message-list" />,
}));

vi.mock("@/components/chat/chat-composer", () => ({
  ChatComposer: () => <div data-testid="composer" />,
}));

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;
  globalThis.IntersectionObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
});

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  shell();
});

function shell() {
  useChatMock.mockReturnValue({
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
    status: "ready",
    error: undefined,
  });
  useMessagesPaginatedMock.mockReturnValue({
    messages: [],
    conversationInfo: {
      id: "conv-1",
      note: { id: "note-1", title: "Bio notes" },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  });
  useUsageMock.mockReturnValue({ chatDailyUsage: null });
  useSessionMock.mockReturnValue({ data: { user: { id: "student-1" } } });
  backupReadMock.mockResolvedValue({ snapshot: null });
  backupSaveMock.mockResolvedValue({ ok: true });
  backupClearMock.mockResolvedValue({ ok: true });
}

function renderThread() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ChatThread conversationId="conv-1" />
    </QueryClientProvider>,
  );
}

describe("chat thread quiz resume (spec 0044, covers: AC-5)", () => {
  it("remounts the dock when a run is active after reload", async () => {
    window.sessionStorage.setItem("ticlearn:quiz:active:conv-1", "run-local");
    window.sessionStorage.setItem(
      "ticlearn:quiz:run:conv-1:run-local",
      JSON.stringify({
        version: 6,
        quizId: "quiz-1",
        answers: { q1: "Paris" },
        marks: {},
        currentIndex: 1,
        count: 5,
        clientRunId: "run-local",
        updatedAt: Date.now(),
      }),
    );

    renderThread();

    expect(await screen.findByTestId("quiz-runner")).toBeInTheDocument();
  });

  it("leaves the dock closed when no run is active", async () => {
    renderThread();

    await screen.findByTestId("composer");
    expect(screen.queryByTestId("quiz-runner")).not.toBeInTheDocument();
  });

  it("seeds storage and remounts from the server backup on a new device", async () => {
    const snapshot = {
      version: 6,
      quizId: "quiz-9",
      answers: { q1: "Paris" },
      marks: {},
      currentIndex: 2,
      count: 5,
      clientRunId: "run-server",
      updatedAt: Date.now(),
    };
    backupReadMock.mockResolvedValueOnce({
      snapshot: JSON.stringify(snapshot),
      clientRunId: "run-server",
    });

    renderThread();

    expect(await screen.findByTestId("quiz-runner")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("ticlearn:quiz:active:conv-1")).toBe(
      "run-server",
    );
  });
});
