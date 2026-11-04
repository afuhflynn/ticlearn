import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizSnapshot } from "@/lib/chat/quiz-snapshot";
import {
  clearRunBackup,
  readRunBackup,
  scheduleRunBackup,
  seedServerBackup,
} from "@/lib/chat/quiz-backup";

const saveMock = vi.hoisted(() => vi.fn());
const readMock = vi.hoisted(() => vi.fn());
const clearMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  api: {
    mutations: {
      chat: {
        saveRunBackup: saveMock,
        readRunBackup: readMock,
        clearRunBackup: clearMock,
      },
    },
  },
}));

const base: QuizSnapshot = {
  version: 6,
  quizId: "quiz-1",
  answers: { q1: "Paris" },
  marks: {},
  currentIndex: 1,
  count: 5,
  clientRunId: "run-1",
  updatedAt: 123,
};

const T0 = new Date("2026-11-03T12:00:00Z").getTime();
let now = T0;

function withRunId(runId: string): QuizSnapshot {
  return { ...base, clientRunId: runId };
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  // Each test starts a full pace window after the last write, so the first
  // schedule of a test always writes at once.
  now += 10_000;
  vi.setSystemTime(now);
  saveMock.mockReset();
  readMock.mockReset();
  clearMock.mockReset();
  saveMock.mockResolvedValue({ ok: true, updatedAt: new Date() });
  clearMock.mockResolvedValue({ ok: true });
  // Drop any paced write left over from the previous test, then forget it.
  clearRunBackup("conv-1");
  saveMock.mockClear();
  clearMock.mockClear();
});

function afterwards() {
  vi.useRealTimers();
}

describe("quiz server backup pacing (spec 0044, covers: AC-5)", () => {
  it("writes at once when idle", async () => {
    scheduleRunBackup("conv-1", withRunId("run-1"));
    await Promise.resolve();

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot: withRunId("run-1"),
    });
    afterwards();
  });

  it("paces writes to at most one per 2 seconds with last write wins", async () => {
    scheduleRunBackup("conv-1", withRunId("run-1"));
    await Promise.resolve();
    expect(saveMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 500);
    scheduleRunBackup("conv-1", { ...withRunId("run-1"), currentIndex: 2 });
    scheduleRunBackup("conv-1", { ...withRunId("run-1"), currentIndex: 3 });
    await Promise.resolve();
    expect(saveMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1500);
    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenLastCalledWith({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot: expect.objectContaining({ currentIndex: 3 }),
    });
    afterwards();
  });

  it("skips the write when the run has no quiz yet", async () => {
    scheduleRunBackup("conv-1", { ...withRunId("run-1"), quizId: null });
    await vi.advanceTimersByTimeAsync(5000);

    expect(saveMock).not.toHaveBeenCalled();
    afterwards();
  });

  it("stays quiet when the network fails and retries on the next mark", async () => {
    saveMock.mockRejectedValueOnce(new Error("offline"));
    scheduleRunBackup("conv-1", withRunId("run-1"));
    await Promise.resolve();
    expect(saveMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 5000);
    scheduleRunBackup("conv-1", { ...withRunId("run-1"), currentIndex: 2 });
    await Promise.resolve();
    expect(saveMock).toHaveBeenCalledTimes(2);
    afterwards();
  });

  it("clear cancels a paced write and clears the server copy", async () => {
    scheduleRunBackup("conv-1", withRunId("run-1"));
    await Promise.resolve();
    expect(saveMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 100);
    scheduleRunBackup("conv-1", { ...withRunId("run-1"), currentIndex: 2 });
    clearRunBackup("conv-1", "run-1");
    await vi.advanceTimersByTimeAsync(5000);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith("conv-1", "run-1");
    afterwards();
  });
});

describe("quiz server backup read (spec 0044, covers: AC-5)", () => {
  it("returns the stored snapshot", async () => {
    const raw = JSON.stringify(base);
    readMock.mockResolvedValue({ snapshot: raw, clientRunId: "run-1" });

    await expect(readRunBackup("conv-1", "run-1")).resolves.toEqual({
      snapshot: raw,
      clientRunId: "run-1",
    });
    expect(readMock).toHaveBeenCalledWith("conv-1", "run-1");
    afterwards();
  });

  it("returns null when the request fails", async () => {
    readMock.mockRejectedValue(new Error("offline"));

    await expect(readRunBackup("conv-1")).resolves.toEqual({
      snapshot: null,
    });
    afterwards();
  });
});

describe("quiz server backup seed (spec 0044, covers: AC-5)", () => {
  const stored = {
    version: 6,
    quizId: "quiz-9",
    answers: {},
    marks: {},
    currentIndex: 2,
    count: 5,
    clientRunId: "run-server",
    updatedAt: 123,
  };

  it("seeds storage plus the active pointer from the latest copy", async () => {
    readMock.mockResolvedValue({
      snapshot: JSON.stringify(stored),
      clientRunId: "run-server",
    });

    await expect(seedServerBackup("conv-1")).resolves.toBe(true);
    expect(
      window.sessionStorage.getItem("ticlearn:quiz:active:conv-1"),
    ).toBe("run-server");
    expect(
      window.sessionStorage.getItem("ticlearn:quiz:run:conv-1:run-server"),
    ).toBe(JSON.stringify(stored));
    afterwards();
  });

  it("refuses a copy with no runnable quiz", async () => {
    readMock.mockResolvedValue({
      snapshot: JSON.stringify({ ...stored, quizId: null }),
      clientRunId: "run-server",
    });

    await expect(seedServerBackup("conv-1")).resolves.toBe(false);
    expect(
      window.sessionStorage.getItem("ticlearn:quiz:active:conv-1"),
    ).toBeNull();
    afterwards();
  });

  it("refuses a copy that is not JSON", async () => {
    readMock.mockResolvedValue({
      snapshot: "not json at all",
      clientRunId: "run-server",
    });

    await expect(seedServerBackup("conv-1")).resolves.toBe(false);
    expect(
      window.sessionStorage.getItem("ticlearn:quiz:active:conv-1"),
    ).toBeNull();
    afterwards();
  });

  it("returns false when storage is full", async () => {
    readMock.mockResolvedValue({
      snapshot: JSON.stringify(stored),
      clientRunId: "run-server",
    });
    const spy = vi
      .spyOn(window.sessionStorage.__proto__, "setItem")
      .mockImplementation(() => {
        throw new Error("full");
      });
    try {
      await expect(seedServerBackup("conv-1")).resolves.toBe(false);
    } finally {
      spy.mockRestore();
    }
    afterwards();
  });
});
