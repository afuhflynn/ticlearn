import type { ProcessStage } from "@/components/ui/process-progress";

/**
 * The stages of the note pipeline, in the order they happen.
 *
 * This list is the same list the `NoteProcessingStage` enum describes, in the
 * same order, so the step count out of the total is a real number and the
 * interface and the database can never disagree about where the work is.
 * The background job writes the stage, the interface reads it.
 */
export const NOTE_STAGES: ProcessStage[] = [
  { value: "EXTRACTING", label: "Reading the note" },
  { value: "SUMMARIZING", label: "Writing the summary" },
  { value: "INDEXING", label: "Finding the topics" },
];
