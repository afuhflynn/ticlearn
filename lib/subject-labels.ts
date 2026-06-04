export const SUBJECT_LABELS: Record<string, string> = {
  CS: "Computer Science",
  ICT: "Information & Communication Technology",
  BIO: "Biology",
  CHEM: "Chemistry",
  PHY: "Physics",
  PMM: "Pure Mathematics with Mechanics",
  PMS: "Pure Mathematics with Statistics",
  FM: "Further Mathematics",
  FSN: "Food Science and Nutrition",
  GEOL: "Geology",
  ENG: "English Language",
  LIT: "Literature in English",
  FRENCH: "French",
  SBE_FR: "Special Bilingual Education French",
  HIST: "History",
  GEOG: "Geography",
  RS: "Religious Studies",
  PHIL: "Philosophy",
  ECONS: "Economics",
  ACCT: "Accounting",
};

export function getSubjectLabel(code: string): string {
  return SUBJECT_LABELS[code] ?? code;
}
