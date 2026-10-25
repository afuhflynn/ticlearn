export const PENDING_CHAT_MESSAGE_PREFIX = "ticlearn-pending-chat";

/** The tutor's visible name. Every student facing surface reads it from here. */
export const TIP_NAME = "Tip";

/** What the composer is filled with when a student asks for practice. */
export const CHAT_QUIZ_PREFILL = "Quiz me on this";

/** The one quiet line naming what Tip can already use. */
export const CHAT_CAPABILITY_LINE =
  "Tip can search the web, read your notes, open your quizzes and check your progress.";

/**
 * The four things a student can start with. A tap fills the composer and
 * focuses it. It never sends, because a starter is a thought, not a message.
 */
export const CHAT_STARTERS = [
  {
    title: "Solve a past paper",
    prompt:
      "Walk me through a past paper question step by step, then let me try one on my own.",
  },
  {
    title: "Explain my notes",
    prompt:
      "Explain the hardest part of my latest note and check whether I understood it.",
  },
  {
    title: "Quiz me",
    prompt:
      "Quiz me on a topic I am studying, with real exam style questions and the mark scheme.",
  },
  {
    title: "Plan my revision",
    prompt:
      "Help me plan my revision for the next two weeks, starting from the topics I find hardest.",
  },
] as const;

/** The label on a stopped answer. */
export const CHAT_STOPPED_LABEL = "Stopped";

/** The sentence a student reads when their daily messages are used up. */
export const CHAT_ALLOWANCE_SPENT_LABEL = "Your daily messages are used up.";
