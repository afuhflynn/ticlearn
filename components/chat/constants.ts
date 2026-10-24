export const PENDING_CHAT_MESSAGE_PREFIX = "ticlearn-pending-chat";

/** The tutor's visible name. Every student facing surface reads it from here. */
export const TIP_NAME = "Tip";

export const CHAT_SUGGESTIONS = [
  "Walk me through this note step by step",
  "Quiz me from my notes with real questions",
  "Explain the hardest part of my latest note",
  "What should I study from this course today?",
];

export const QUICK_ACTIONS = [
  {
    title: "Study today",
    description: "Pick one thing from your notes and start there.",
    prompt:
      "Look at the notes I have uploaded and pick the one thing I should study today. Tell me why, then teach the first step.",
    icon: "progress" as const,
  },
  {
    title: "Photo of your notes",
    description: "Attach a photo and Tip reads it back to you.",
    prompt:
      "I am going to attach a photo of my notes. Read it, tell me what it covers, then teach me the hardest part of it.",
    icon: "image" as const,
  },
  {
    title: "Note transformer",
    description: "Convert notes into flashcards, summaries, or quizzes.",
    prompt:
      "Use my uploaded note or my note library to create a concise summary, 10 flashcards, and 5 practice questions.",
    icon: "notes" as const,
  },
  {
    title: "Mistake debrief",
    description: "Review mistakes and decide what to do next.",
    prompt:
      "Analyze my recent quiz performance and give me a mistake debrief with next actions.",
    icon: "quiz" as const,
  },
];
