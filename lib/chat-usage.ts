const DOUALA_UTC_OFFSET_MINUTES = 60;

export function getChatResetWindow(now = new Date()) {
  const offsetMs = DOUALA_UTC_OFFSET_MINUTES * 60 * 1000;
  const shiftedNow = new Date(now.getTime() + offsetMs);

  const year = shiftedNow.getUTCFullYear();
  const month = shiftedNow.getUTCMonth();
  const day = shiftedNow.getUTCDate();

  const windowStart = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMs,
  );
  const nextResetAt = new Date(
    Date.UTC(year, month, day + 1, 0, 0, 0, 0) - offsetMs,
  );

  return {
    windowStart,
    nextResetAt,
    resetsInSeconds: Math.max(
      0,
      Math.floor((nextResetAt.getTime() - now.getTime()) / 1000),
    ),
  };
}

export function getRemainingAllowance(limit: number, used: number) {
  if (limit === -1) {
    return -1;
  }

  return Math.max(0, limit - used);
}
