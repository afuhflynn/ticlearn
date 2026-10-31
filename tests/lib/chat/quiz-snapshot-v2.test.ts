import { beforeEach, describe, expect, it } from "vitest";
import {
  loadQuizSnapshot,
  QUIZ_SNAPSHOT_VERSION,
  saveQuizSnapshot,
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

beforeEach(() => {
  mockStorage();
});

describe("quiz snapshot v2 wizard (spec 0033, covers: AC-5, AC-7)", () => {
  it("saves a wizard run with no quiz id yet and reloads the same step", () => {
    saveQuizSnapshot("conv-1", {
      version: 2,
      quizId: null,
      answers: {},
      marks: {},
      currentIndex: 0,
      count: 5,
      clientRunId: "run-wiz",
      updatedAt: 1,
      topicText: "Photosynthesis",
      noteId: "note-1",
      noteTitle: "Photosynthesis",
      levelChoice: "GCE",
      formatChoice: "MCQ plus structured",
      difficulty: "STANDARD",
      totalMarks: 20,
      stepIndex: 2,
      wizardDone: false,
      collapsed: false,
    });

    const loaded = loadQuizSnapshot("conv-1", "run-wiz");
    expect(loaded?.stepIndex).toBe(2);
    expect(loaded?.topicText).toBe("Photosynthesis");
    expect(loaded?.quizId).toBeNull();
  });

  it("still loads a version 1 runner snapshot", () => {
    const store = mockStorage();
    store.set(
      snapshotKey("conv-1", "run-1"),
      JSON.stringify({
        version: 1,
        quizId: "quiz-1",
        answers: {},
        marks: {},
        currentIndex: 1,
        count: 5,
        clientRunId: "run-1",
        updatedAt: 1,
      }),
    );

    const loaded = loadQuizSnapshot("conv-1", "run-1");
    expect(loaded?.quizId).toBe("quiz-1");
    expect(loaded?.version).toBe(QUIZ_SNAPSHOT_VERSION);
  });

  it("drops a snapshot with an unknown version", () => {
    const store = mockStorage();
    store.set(
      snapshotKey("conv-1", "run-1"),
      JSON.stringify({
        version: 99,
        quizId: null,
        clientRunId: "run-1",
        stepIndex: 2,
      }),
    );

    expect(loadQuizSnapshot("conv-1", "run-1")).toBeNull();
  });
});
