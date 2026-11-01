/**
 * One Douala day helper. Cameroon stays on UTC plus one with no daylight
 * saving, so a fixed 60 minute offset is the Douala midnight the spec names.
 * Every prompt plus usage plus credit read uses this, so the day never drifts.
 */
const DOUALA_OFFSET_MS = 60 * 60 * 1000;

export function getDoualaDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + DOUALA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();

  const dayStart = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - DOUALA_OFFSET_MS,
  );
  const nextMidnight = new Date(
    Date.UTC(year, month, day + 1, 0, 0, 0, 0) - DOUALA_OFFSET_MS,
  );

  return { dayStart, nextMidnight };
}

export function getDoualaDayKey(now = new Date()): string {
  const shifted = new Date(now.getTime() + DOUALA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDoualaDay(a: Date, b: Date): boolean {
  return getDoualaDayKey(a) === getDoualaDayKey(b);
}

export function nextDoualaMidnightIso(now = new Date()): string {
  return getDoualaDayBounds(now).nextMidnight.toISOString();
}

/** Short Douala clock label for the spent allowance line, e.g. "00:00". */
export function doualaResetLabel(nextMidnight: Date): string {
  try {
    return nextMidnight.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Douala",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return nextMidnight.toISOString().slice(11, 16);
  }
}
