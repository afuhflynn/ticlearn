export const PENDING_CHAT_MESSAGE_PREFIX = "ticlearn-pending-chat";

export const CHAT_SUGGESTIONS = [
  "Explain my weakest topic like I am revising tonight",
  "Turn this uploaded question into a step-by-step solution",
  "Build a 7-day study sprint from my progress",
  "Quiz me from my notes with exam-style questions",
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
    title: "Past-paper lens",
    description: "Upload a question image or PDF and unpack it.",
    prompt:
      "I am going to attach a past-paper question. Read it, identify the topic, explain the solution, and show what examiners expect.",
    icon: "image" as const,
  },
  {
    title: "Note transformer",
    description: "Convert notes into flashcards, summaries, or quizzes.",
    prompt:
      "Use my uploaded note or my note library to create a concise summary, 10 flashcards, and 5 exam-style questions.",
    icon: "notes" as const,
  },
  {
    title: "Mock debrief",
    description: "Review mistakes and decide what to do next.",
    prompt:
      "Analyze my recent mock or quiz performance and give me a mistake debrief with next actions.",
    icon: "quiz" as const,
  },
];
