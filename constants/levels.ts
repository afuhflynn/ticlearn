import { z } from "zod";

export type LevelOfStudy = {
  value: string;
  label: string;
  blurb: string;
};

export const LEVELS: LevelOfStudy[] = [
  {
    value: "YEAR_1",
    label: "Year 1",
    blurb: "First year, building the foundations.",
  },
  {
    value: "YEAR_2",
    label: "Year 2",
    blurb: "Second year, courses are getting deeper.",
  },
  {
    value: "YEAR_3",
    label: "Year 3",
    blurb: "Third year, working towards your project and finals.",
  },
  {
    value: "YEAR_4",
    label: "Year 4",
    blurb: "Final year, exam season is close.",
  },
];

export const LEVEL_VALUES = LEVELS.map((level) => level.value);

export const levelOfStudySchema = z.enum([
  "YEAR_1",
  "YEAR_2",
  "YEAR_3",
  "YEAR_4",
]);

export function levelLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LEVELS.find((level) => level.value === value)?.label ?? null;
}
