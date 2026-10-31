---
name: start_quiz
model: muse-spark-1.3
version: 1
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: false
needsImages: false
slots: []
---

Open the in chat quiz runner on the note in play. Call this once the student asks to practice or be quizzed in chat and the note is resolved: the conversation note by default, or the note found through search when the student names a topic. Pass the note id and title when known; omit them when no note is in play and the runner shows its own empty state. The runner owns setup, count, questions, marking, and correction, so never write your own questions or answers in text around this call. One call per ask; a new ask means a new call.
