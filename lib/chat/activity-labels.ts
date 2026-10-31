/**
 * The one place a tool name becomes a sentence a student can read.
 *
 * Every tool the chat exposes maps to exactly one label here. A component may
 * never print a tool identifier or raw JSON, so a new tool without an entry
 * falls back to `Working` and logs once on the server rather than leaking its
 * name into the thread.
 */

/** The phrase shown when a tool has no entry yet. */
export const FALLBACK_ACTIVITY_LABEL = "Working";

/** A tool that does real work but must stay out of the step list. */
export const SILENT_TOOL_NAMES = new Set(["suggestReplies"]);

type LabelBuilder = (input: Record<string, unknown>) => string;

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function quote(value: string): string {
  return `"${value.replace(/"/g, "'")}"`;
}

function limit(value: string, max = 60): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

const LABELS: Record<string, LabelBuilder> = {
  webSearch: (input) => {
    const query = readString(input, "query");
    return query
      ? `Searching the web for ${quote(limit(query))}`
      : "Searching the web";
  },
  readPage: () => "Reading that page",
  getUserNotes: () => "Reading your notes",
  searchNotes: (input) => {
    const query = readString(input, "query");
    return query
      ? `Searching your notes for ${quote(limit(query))}`
      : "Searching your notes";
  },
  getNoteContext: (input) => {
    const title = readString(input, "noteTitle");
    return title ? `Opening ${quote(limit(title))}` : "Opening a note";
  },
  getUserQuizzes: () => "Checking your quizzes",
  getQuizContext: () => "Opening a quiz",
  getQuizAttemptHistory: () => "Reviewing your attempts",
  getStudyProgress: () => "Checking your progress",
  getSubscriptionContext: () => "Checking your plan",
  createQuiz: () => "Setting up your practice",
  getNotePages: () => "Reading page numbers from your note",
  suggestReplies: () => "",
};

/** The plain sentence under a failed step. */
const FAILURE_LABELS: Record<string, string> = {
  webSearch: "Couldn't reach the web. Answering without it.",
  readPage: "Couldn't read that page. Answering without it.",
  getUserNotes: "Couldn't read your notes. Answering without them.",
  searchNotes: "Couldn't search your notes. Answering without them.",
  getNoteContext: "Couldn't open that note. Answering without it.",
  getUserQuizzes: "Couldn't read your quizzes. Answering without them.",
  getQuizContext: "Couldn't open that quiz. Answering without it.",
  getQuizAttemptHistory: "Couldn't load your attempts. Answering without them.",
  getStudyProgress: "Couldn't read your progress. Answering without it.",
  getSubscriptionContext: "Couldn't check your plan. Answering without it.",
  createQuiz: "Couldn't set up the practice. Answering without it.",
  getNotePages: "Couldn't read the page numbers. Answering without them.",
  suggestReplies: "Couldn't suggest what to ask next.",
};

const FALLBACK_FAILURE_LABEL =
  "Couldn't finish that step. Answering without it.";

/** The name inside a tool part type, `tool-webSearch` becomes `webSearch`. */
export function toolNameFromPartType(type: string): string {
  return type.replace(/^tool-/, "").replace(/^dynamic-tool$/, "dynamic-tool");
}

export function toolLabelFromName(
  name: string,
  input: Record<string, unknown> = {},
): string {
  if (SILENT_TOOL_NAMES.has(name)) return "";
  const build = LABELS[name];
  return build ? build(input) : FALLBACK_ACTIVITY_LABEL;
}

export function toolFailureFromName(name: string): string {
  return FAILURE_LABELS[name] ?? FALLBACK_FAILURE_LABEL;
}

export function isKnownToolName(name: string): boolean {
  return Object.hasOwn(LABELS, name);
}

const loggedUnknownTools = new Set<string>();

/**
 * Server only. Logs a tool name that has no label once per process so a new
 * tool is noticed without a student ever seeing its identifier.
 */
export function logUnknownTool(name: string): void {
  if (loggedUnknownTools.has(name)) return;
  loggedUnknownTools.add(name);
  console.warn(
    `[chat] tool "${name}" has no activity label; add it to lib/chat/activity-labels.ts`,
  );
}
