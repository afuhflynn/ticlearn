---
name: create_quiz
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Create a quiz for the authenticated user. Can be linked to one of their notes (noteId) or standalone with no note link. Generates the full quiz with all questions in one shot. Use this when the user asks to generate, create, or make a quiz - either from a specific note or on a topic from the conversation.
