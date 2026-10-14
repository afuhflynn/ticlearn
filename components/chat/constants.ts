export const PENDING_CHAT_MESSAGE_PREFIX = "ticlearn-pending-chat";

/** The tutor's visible name. Every student facing surface reads it from here. */
export const TIP_NAME = "Tip";

export const CHAT_SUGGESTIONS = [
  "Explain my weakest topic like I am revising tonight",
  "Walk me through this note step by step",
  "Build a 7-day study sprint from my progress",
  "Quiz me from my notes with real questions",
];

export const QUICK_ACTIONS = [
  {
    title: "Study cockpit",
    description: "Plan today from readiness, streaks, and weak topics.",
    prompt:
      "Look at my current study progress and build a focused plan for today. Prioritize my weakest topics and include one quick win.",
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
