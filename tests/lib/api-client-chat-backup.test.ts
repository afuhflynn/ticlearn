import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";

const privateGet = vi.hoisted(() => vi.fn());
const privatePost = vi.hoisted(() => vi.fn());
const privateDelete = vi.hoisted(() => vi.fn());

vi.mock("@/config/axios.config", () => ({
  privateAxios: {
    get: privateGet,
    post: privatePost,
    delete: privateDelete,
  },
  publicAxios: { get: privateGet },
}));

beforeEach(() => {
  privateGet.mockReset();
  privatePost.mockReset();
  privateDelete.mockReset();
});

const snapshot = {
  version: 6,
  quizId: "quiz-1",
  answers: {},
  marks: {},
  currentIndex: 1,
  count: 5,
  clientRunId: "run-1",
  updatedAt: 123,
};

describe("api client chat run backup (spec 0044, covers: AC-5)", () => {
  it("posts the snapshot to the backup endpoint", async () => {
    privatePost.mockResolvedValue({ data: { ok: true } });

    await api.mutations.chat.saveRunBackup({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });

    expect(privatePost).toHaveBeenCalledWith("/chat/runs/backup", {
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });
  });

  it("reads the backup by run id when given", async () => {
    privateGet.mockResolvedValue({ data: { snapshot: "raw" } });

    await api.mutations.chat.readRunBackup("conv-1", "run-1");

    expect(privateGet).toHaveBeenCalledWith(
      "/chat/runs/backup?conversationId=conv-1&clientRunId=run-1",
    );
  });

  it("reads the latest backup when no run id is given", async () => {
    privateGet.mockResolvedValue({ data: { snapshot: null } });

    await api.mutations.chat.readRunBackup("conv-1");

    expect(privateGet).toHaveBeenCalledWith(
      "/chat/runs/backup?conversationId=conv-1",
    );
  });

  it("clears one run copy scoped to the owner conversation", async () => {
    privateDelete.mockResolvedValue({ data: { ok: true } });

    await api.mutations.chat.clearRunBackup("conv-1", "run-1");

    expect(privateDelete).toHaveBeenCalledWith(
      "/chat/runs/backup?conversationId=conv-1&clientRunId=run-1",
      { data: undefined },
    );
  });
});
