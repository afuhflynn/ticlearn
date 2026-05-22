import type { MockSessionPayload } from "@/lib/mock-generator";

/** Accepts payloads stored via Prisma `Json`; rejects null / malformed / empty. */
export function parseStoredSessionPayload(
  raw: unknown,
): MockSessionPayload | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  if (!Array.isArray(rec.sections) || rec.sections.length === 0) return null;
  return raw as MockSessionPayload;
}

/** Strip grading keys before sending the payload to clients while an attempt is ongoing. */
export function sanitizeSessionPayloadForExaminee(
  payload: MockSessionPayload,
): MockSessionPayload {
  return {
    ...payload,
    sections: payload.sections.map((sec) => ({
      ...sec,
      questions: sec.questions.map((q) => {
        const { correctOption: _omitCo, modelAnswer: _omitMa, ...rest } = q;
        return rest;
      }),
    })),
  };
}
