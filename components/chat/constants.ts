export const CHAT_SUGGESTIONS = [
  "What notes do I have right now?",
  "Summarize my latest Biology note",
  "Show my recent quiz attempts",
  "What is my study progress this week?",
  "Help me revise quadratic equations",
];

export const QUICK_ACTIONS = [
  {
    title: "Browse Notes",
    description: "Find and review your uploaded study notes",
    prompt: "Show me all my notes",
    icon: "notes" as const,
  },
  {
    title: "Study Progress",
    description: "Check your weekly stats and streaks",
    prompt: "What is my study progress this week?",
    icon: "progress" as const,
  },
  {
    title: "Practice Quiz",
    description: "Generate a quiz from any topic",
    prompt: "Create a quiz for me to practice",
    icon: "quiz" as const,
  },
  {
    title: "Upload Image",
    description: "Send a photo of a question to solve",
    prompt: "Help me solve this question",
    icon: "image" as const,
  },
];

export const PENDING_CHAT_MESSAGE_PREFIX = "ticlearn.chat.pending";
