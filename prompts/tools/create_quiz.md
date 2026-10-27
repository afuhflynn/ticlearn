---
name: create_quiz
model: openai/gpt-oss-120b
version: 4
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Create a quiz with questions and answers in one shot. Use this when the student asks to generate, create, or make a quiz, a test, or practice questions.

When one of the student's notes is in play, pass its id as noteId and its title as noteTitle. When no note is in play, build the quiz from the topic the student named and leave noteId out; the quiz title becomes the card title. Never invent a note id. If the topic itself is not clear enough to write fair questions, ask one short question first.

The result carries a ready link for the student. In the same turn, end your answer with that link as markdown, for example [Take your quiz](/quizzes/abc123), followed by one short line naming what is in it: the question count, the mix of choice and free-response questions, and whether it is timed. Never print a bare quiz id. Never make the student look for the quiz themselves; the link arrives with the answer. If the tool reports a failure, name the real reason it gave, mixed categories and difficulty levels come free with the question text, so never refuse a mix for a technical reason, and say the next step honestly instead of promising a retry you cannot make.
