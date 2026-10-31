import { beforeEach, describe, expect, it } from "vitest";
import {
  activeKey,
  clearActiveRunId,
  clearQuizSnapshot,
  getActiveRunId,
  loadQuizSnapshot,
  newQuizRunId,
  type QuizSnapshot,
  saveQuizSnapshot,
  setActiveRunId,
  snapshotKey,
} from "@/lib/chat/quiz-snapshot";

function mockStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = {
    sessionStorage: storage,
  };
  return store;
}

const base: QuizSnapshot = {
  version: 1,
  quizId: "quiz-1",
  answers: { "q-1": "Paris" },
  marks: { "q-1": { isCorrect: true, why: "That is correct." } },
  currentIndex: 1,
  count: 5,
  clientRunId: "run-1",
  updatedAt: 123,
};

beforeEach(() => {
  mockStorage();
});

describe("quiz snapshot keys", () => {
  it("scopes the active pointer to one conversation", () => {
    expect(activeKey("conv-1")).toBe("ticlearn:quiz:active:conv-1");
  });

  it("scopes one snapshot to one conversation plus one run", () => {
    expect(snapshotKey("conv-1", "run-1")).toBe(
      "ticlearn:quiz:run:conv-1:run-1",
    );
  });

  it("makes a fresh run id per run", () => {
    expect(newQuizRunId()).not.toBe(newQuizRunId());
  });
});

describe("quiz snapshot round trip", () => {
  it("saves and reloads answers plus marks plus position", () => {
    saveQuizSnapshot("conv-1", base);

    expect(getActiveRunId("conv-1")).toBe("run-1");
    const loaded = loadQuizSnapshot("conv-1", "run-1");
    expect(loaded?.quizId).toBe("quiz-1");
    expect(loaded?.answers).toEqual({ "q-1": "Paris" });
    expect(loaded?.marks["q-1"]?.isCorrect).toBe(true);
    expect(loaded?.currentIndex).toBe(1);
  });

  it("keeps two runs separate under one conversation", () => {
    saveQuizSnapshot("conv-1", base);
    saveQuizSnapshot("conv-1", {
      ...base,
      clientRunId: "run-2",
      quizId: "quiz-2",
    });

    expect(loadQuizSnapshot("conv-1", "run-1")?.quizId).toBe("quiz-1");
    expect(loadQuizSnapshot("conv-1", "run-2")?.quizId).toBe("quiz-2");
  });

  it("drops a snapshot with a wrong version", () => {
    const store = mockStorage();
    store.set(
      snapshotKey("conv-1", "run-1"),
      JSON.stringify({ ...base, version: 99 }),
    );

    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
  });

  it("clears the snapshot plus the active pointer on submit or close", () => {
    saveQuizSnapshot("conv-1", base);
    setActiveRunId("conv-1", "run-1");
    clearQuizSnapshot("conv-1", "run-1");

    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
    expect(getActiveRunId("conv-1")).toBeNull();
  });

  it("clears only the active pointer when asked", () => {
    saveQuizSnapshot("conv-1", base);
    clearActiveRunId("conv-1");

    expect(getActiveRunId("conv-1")).toBeNull();
    expect(loadQuizSnapshot("conv-1", "run-1")?.quizId).toBe("quiz-1");
  });
});

describe("quiz snapshot bad data (spec 0031, covers: AC-5)", () => {
  it("returns null when the stored text is not JSON", () => {
    const store = mockStorage();
    store.set(snapshotKey("conv-1", "run-1"), "not json at all");

    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
  });

  it("returns null when quiz id or run id is missing", () => {
    const store = mockStorage();
    store.set(
      snapshotKey("conv-1", "run-1"),
      JSON.stringify({ version: 1, answers: {} }),
    );

    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
  });

  it("returns null for empty ids and never throws", () => {
    mockStorage();

    expect(getActiveRunId("")).toBeNull();
    expect(loadQuizSnapshot("", "run-1")).toBeNull();
    expect(loadQuizSnapshot("conv-1", "")).toBeNull();
    expect(() => clearQuizSnapshot("", "")).not.toThrow();
    expect(() => setActiveRunId("", "")).not.toThrow();
    expect(() => clearActiveRunId("")).not.toThrow();
  });

  it("writes nothing when the run id is missing", () => {
    const store = mockStorage();
    saveQuizSnapshot("conv-1", { ...base, clientRunId: "" });

    expect(store.size).toBe(0);
    expect(getActiveRunId("conv-1")).toBeNull();
  });

  it("stays silent when storage throws, as on a full quota", () => {
    (globalThis as unknown as { window: unknown }).window = {
      sessionStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("full");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      },
    };

    expect(() => saveQuizSnapshot("conv-1", base)).not.toThrow();
    expect(getActiveRunId("conv-1")).toBeNull();
    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
    expect(() => clearQuizSnapshot("conv-1", "run-1")).not.toThrow();
  });

  it("falls back to a unique id when random ids are missing", () => {
    const uuid = crypto.randomUUID;
    (crypto as { randomUUID?: unknown }).randomUUID = undefined;
    try {
      const first = newQuizRunId();
      const second = newQuizRunId();

      expect(first.startsWith("ticlearn-chat-")).toBe(true);
      expect(first).not.toBe(second);
    } finally {
      crypto.randomUUID = uuid;
    }
  });
});
