import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, NetworkError } from "@/lib/api-client";

const privateGet = vi.hoisted(() => vi.fn());
const privatePost = vi.hoisted(() => vi.fn());

vi.mock("@/config/axios.config", () => ({
  privateAxios: { get: privateGet, post: privatePost },
  publicAxios: { get: privateGet },
}));

beforeEach(() => {
  privateGet.mockReset();
  privatePost.mockReset();
});

describe("api client read failures", () => {
  it("turns a request with no response into a NetworkError", async () => {
    privateGet.mockRejectedValue(
      new axios.AxiosError("Network Error", "ERR_NETWORK"),
    );

    await expect(api.queries.notes.getAll()).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("keeps the server error message for a failed read", async () => {
    privateGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Notes are unavailable" } },
    });

    await expect(api.queries.notes.getAll()).rejects.toThrow(
      "Notes are unavailable",
    );
  });

  it("uses a plain fallback for an unexpected client failure", async () => {
    privateGet.mockRejectedValue(new Error("implementation detail"));

    await expect(api.queries.notes.getAll()).rejects.toThrow(
      "An unexpected error occurred",
    );
  });
});

describe("api client wizard generate (spec 0033, covers: AC-8)", () => {
  it("posts the wizard picks to the wizard endpoint", async () => {
    privatePost.mockResolvedValue({
      data: { quiz: { id: "quiz-1" }, success: true },
    });
    const payload = {
      topicText: "Photosynthesis",
      noteId: "note-1",
      levelChoice: "GCE" as const,
      formatChoice: "MCQ plus structured",
      count: 5,
      difficulty: "STANDARD" as const,
    };

    await api.mutations.quizzes.wizardGenerate(payload);

    expect(privatePost).toHaveBeenCalledWith(
      "/quizzes/wizard-generate",
      payload,
    );
  });

  it("keeps the server error message for a failed wizard generate", async () => {
    privatePost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Quiz generation limit reached (4)." } },
    });

    await expect(
      api.mutations.quizzes.wizardGenerate({
        topicText: "Photosynthesis",
        noteId: null,
        levelChoice: "MIXED",
        formatChoice: "Mixed format",
        count: 5,
        difficulty: "STANDARD",
      }),
    ).rejects.toThrow("Quiz generation limit reached (4).");
  });
});
