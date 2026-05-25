/** Cameroon GCE Advanced Level exams typically start mid-June. */
export const GCE_EXAM_MONTH = 5; // June (0-indexed)
export const GCE_EXAM_DAY = 15;

export type GceCountdownSnapshot = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  examDateIso: string;
  examLabel: string;
};

export function getNextGceExamDate(from: Date = new Date()): Date {
  let year = from.getUTCFullYear();
  let exam = new Date(Date.UTC(year, GCE_EXAM_MONTH, GCE_EXAM_DAY, 0, 0, 0, 0));

  if (from.getTime() >= exam.getTime()) {
    year += 1;
    exam = new Date(Date.UTC(year, GCE_EXAM_MONTH, GCE_EXAM_DAY, 0, 0, 0, 0));
  }

  return exam;
}

export function getGceCountdownSnapshot(
  from: Date = new Date(),
): GceCountdownSnapshot {
  const exam = getNextGceExamDate(from);
  const ms = Math.max(0, exam.getTime() - from.getTime());

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);

  const examLabel = exam.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    days,
    hours,
    minutes,
    seconds,
    examDateIso: exam.toISOString(),
    examLabel,
  };
}

export function countdownFromExamDate(
  examDateIso: string,
  now: Date = new Date(),
): Omit<GceCountdownSnapshot, "examDateIso" | "examLabel"> {
  const ms = Math.max(0, new Date(examDateIso).getTime() - now.getTime());

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1_000),
  };
}
