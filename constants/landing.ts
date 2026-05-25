export type SampleMock = {
  id: string;
  title: string;
  shortTitle: string;
  subject: string;
  paper: "Paper 1" | "Paper 2";
  paperType: "MCQ" | "Structured";
  durationMin: number;
  questionCount: number;
  totalMarks: number;
  level: "Standard";
  description: string;
};

export const SAMPLE_MOCKS: SampleMock[] = [
  {
    id: "cs-p1",
    title: "Computer Science Paper 1",
    shortTitle: "Computer Science Paper 1",
    subject: "Computer Science",
    paper: "Paper 1",
    paperType: "MCQ",
    durationMin: 60,
    questionCount: 50,
    totalMarks: 50,
    level: "Standard",
    description:
      "Timed multiple-choice mock written in Paper 1 style. Instant scoring on every item.",
  },
  {
    id: "phy-p2",
    title: "Physics Paper 2",
    shortTitle: "Physics structured theory",
    subject: "Physics",
    paper: "Paper 2",
    paperType: "Structured",
    durationMin: 120,
    questionCount: 8,
    totalMarks: 100,
    level: "Standard",
    description:
      "Structured long-form questions under exam conditions, with marking support for written working.",
  },
  {
    id: "math-p1",
    title: "Mathematics Paper 1",
    shortTitle: "Mathematics Paper 1",
    subject: "Mathematics",
    paper: "Paper 1",
    paperType: "MCQ",
    durationMin: 60,
    questionCount: 50,
    totalMarks: 50,
    level: "Standard",
    description:
      "Broad coverage across core topics—useful as a pacing check before sitting the real Paper 1.",
  },
  {
    id: "chem-p2",
    title: "Chemistry Paper 2",
    shortTitle: "Chemistry Paper 2",
    subject: "Chemistry",
    paper: "Paper 2",
    paperType: "Structured",
    durationMin: 120,
    questionCount: 8,
    totalMarks: 100,
    level: "Standard",
    description:
      "Structured theory paper with sectional marks aligned to typical GCE weighting.",
  },
];

