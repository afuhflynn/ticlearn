import { describe, expect, it } from "vitest";
import {
  doualaResetLabel,
  getDoualaDayBounds,
  getDoualaDayKey,
  isSameDoualaDay,
} from "@/lib/day";

describe("Douala day", () => {
  it("starts the day at 00:00 Douala", () => {
    const noon = new Date("2026-11-01T12:00:00Z");
    const { dayStart, nextMidnight } = getDoualaDayBounds(noon);
    expect(dayStart.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(nextMidnight.toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });

  it("keys two moments on the same Douala day together", () => {
    const a = new Date("2026-11-01T00:30:00+01:00");
    const b = new Date("2026-11-01T23:30:00+01:00");
    expect(getDoualaDayKey(a)).toBe(getDoualaDayKey(b));
    expect(isSameDoualaDay(a, b)).toBe(true);
  });

  it("splits either side of Douala midnight", () => {
    const a = new Date("2026-11-01T23:30:00+01:00");
    const b = new Date("2026-11-02T00:30:00+01:00");
    expect(isSameDoualaDay(a, b)).toBe(false);
  });

  it("labels the reset clock in Douala time", () => {
    const next = new Date("2026-11-01T23:00:00.000Z");
    expect(doualaResetLabel(next)).toBe("00:00");
  });
});
