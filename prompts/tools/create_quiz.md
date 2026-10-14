---
name: create_quiz
model: openai/gpt-oss-120b
version: 2
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Create a quiz from one of the student's own notes. Generates the full quiz with all questions in one shot. Use this when the student asks to generate, create, or make a quiz. If they ask for a quiz and no note is in play, ask which of their notes to use, list the notes you can see with getUserNotes, and do not invent a topic.