import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, NetworkError } from "@/lib/api-client";

const privateGet = vi.hoisted(() => vi.fn());

vi.mock("@/config/axios.config", () => ({
  privateAxios: { get: privateGet },
  publicAxios: { get: privateGet },
}));

beforeEach(() => {
  privateGet.mockReset();
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
