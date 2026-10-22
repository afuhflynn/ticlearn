import { describe, expect, it } from "vitest";
import { isNetworkError, NetworkError } from "@/lib/api-client";
import { readState } from "@/lib/read-state";

describe("readState", () => {
  it("is pending when the region has no data yet", () => {
    const state = readState({
      isPending: true,
      isFetching: true,
      isError: false,
      error: null,
    });

    expect(state.isPending).toBe(true);
    expect(state.isRefreshing).toBe(false);
  });

  it("is refreshing when a request is in flight over data the student has", () => {
    const state = readState({
      isPending: false,
      isFetching: true,
      isError: false,
      error: null,
    });

    expect(state.isRefreshing).toBe(true);
  });

  it("is not refreshing while the app polls on its own", () => {
    const state = readState(
      {
        isPending: false,
        isFetching: true,
        isError: false,
        error: null,
      },
      true,
    );

    expect(state.isRefreshing).toBe(false);
  });

  it("tells a lost connection apart from a server error", () => {
    const offline = readState({
      isPending: false,
      isFetching: false,
      isError: true,
      error: new NetworkError(),
    });
    const serverError = readState({
      isPending: false,
      isFetching: false,
      isError: true,
      error: new Error("Failed to fetch notes"),
    });

    expect(offline.isOffline).toBe(true);
    expect(offline.isError).toBe(true);
    expect(serverError.isOffline).toBe(false);
    expect(serverError.isError).toBe(true);
  });
});

describe("isNetworkError", () => {
  it("recognises the failure the api client raises for a lost connection", () => {
    expect(isNetworkError(new NetworkError())).toBe(true);
    expect(isNetworkError(new Error("An unexpected error occurred"))).toBe(
      false,
    );
    expect(isNetworkError(null)).toBe(false);
  });
});
