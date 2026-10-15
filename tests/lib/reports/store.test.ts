import { describe, expect, it } from "vitest";
import { getReport, setReport } from "@/lib/reports/store";

describe("reports store (covers: AC-5)", () => {
  it("returns undefined for an id it has never seen", () => {
    expect(getReport("never-seen-id")).toBeUndefined();
  });

  it("stores and returns a processing entry", () => {
    setReport("r-processing", { status: "PROCESSING" });

    expect(getReport("r-processing")).toEqual({ status: "PROCESSING" });
  });

  it("moves an entry from processing to completed with a base64 buffer for download", () => {
    setReport("r-done", { status: "PROCESSING" });

    setReport("r-done", { status: "COMPLETED", buffer: "cGRm" });

    expect(getReport("r-done")).toEqual({
      status: "COMPLETED",
      buffer: "cGRm",
    });
  });

  it("keeps a failed status and its reason so the caller can show it", () => {
    setReport("r-fail", { status: "FAILED", error: "render timed out" });

    expect(getReport("r-fail")).toEqual({
      status: "FAILED",
      error: "render timed out",
    });
  });
});
