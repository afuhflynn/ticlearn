import { prisma } from "@/lib/prisma";

export type Paper3Subject = "COMPUTER_SCIENCE" | "ICT";

export const SUBJECT_TASK_TYPES: Record<Paper3Subject, string[]> = {
  COMPUTER_SCIENCE: [
    "EXCEL_FORMULA",
    "EXCEL_GRID",
    "ACCESS_TABLE",
    "ACCESS_RELATIONSHIP",
    "SQL_QUERY",
    "C_PROGRAM",
    "PASCAL_PROGRAM",
    "WEB_PROGRAMMING",
    "ALGORITHM_PSEUDOCODE",
    "INPUT_FIELD",
  ],
  ICT: [
    "EXCEL_FORMULA",
    "EXCEL_GRID",
    "WEB_PROGRAMMING",
    "INPUT_FIELD",
  ],
};

export const SUBJECT_CATEGORIES: Record<Paper3Subject, string[]> = {
  COMPUTER_SCIENCE: ["MIXED", "DATABASE", "SPREADSHEET", "PROGRAMMING", "WEB_PROGRAMMING"],
  ICT: ["MIXED", "SPREADSHEET", "WEB_PROGRAMMING"],
};

export const PROGRAM_CODE_TO_SUBJECT: Record<string, Paper3Subject> = {
  CS: "COMPUTER_SCIENCE",
  ICT: "ICT",
};

export async function getUserPaper3Subjects(userId: string): Promise<Paper3Subject[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeProfileId: true,
      examProfiles: {
        where: { activeForUser: { id: userId } },
        select: {
          id: true,
          programs: {
            select: {
              program: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.activeProfileId) return [];

  const activeProfile = user.examProfiles.find(
    (p) => p.id === user.activeProfileId,
  );
  if (!activeProfile) return [];

  const subjects: Paper3Subject[] = [];
  for (const ep of activeProfile.programs) {
    const subject = PROGRAM_CODE_TO_SUBJECT[ep.program.code];
    if (subject && !subjects.includes(subject)) {
      subjects.push(subject);
    }
  }
  return subjects;
}

export function getSubjectAllowedTaskTypes(subjects: Paper3Subject[]): string[] | null {
  if (subjects.length === 0) return null;
  const allowed = new Set<string>();
  for (const s of subjects) {
    for (const t of SUBJECT_TASK_TYPES[s]) {
      allowed.add(t);
    }
  }
  return Array.from(allowed);
}
