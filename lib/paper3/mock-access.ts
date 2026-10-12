import type { Paper3Subject } from "@/lib/generated/prisma/client";

/** Whether a published mock should appear to a student (catalog, start exam, GET detail). */
export function canStudentAccessPublishedMock(
  mock: {
    subject: Paper3Subject;
    visibleToAllStudents: boolean;
    module: { status: string; visibleToAllStudents: boolean } | null;
  },
  userSubjectCodes: Paper3Subject[],
): boolean {
  if (userSubjectCodes.length > 0 && !userSubjectCodes.includes(mock.subject)) {
    return false;
  }

  if (mock.visibleToAllStudents) {
    return true;
  }

  if (
    mock.module &&
    mock.module.status === "PUBLISHED" &&
    mock.module.visibleToAllStudents
  ) {
    return true;
  }

  return false;
}
