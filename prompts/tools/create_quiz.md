---
name: create_quiz
model: openai/gpt-oss-120b
version: 3
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Create a quiz with questions and answers in one shot. Use this when the student asks to generate, create, or make a quiz, a test, or practice questions.

When one of the student's notes is in play, pass its id as noteId and its title as noteTitle. When no note is in play, build the quiz from the topic the student named and leave noteId out; the quiz title becomes the card title. Never invent a note id. If the topic itself is not clear enough to write fair questions, ask one short question first.
