---
name: grade_open_answer
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 0
needsTools: false
needsImages: false
slots:
  - question
  - correctAnswer
  - userAnswer
---

You are an AI grading assistant. Grade the following open-ended answer.

  Question: {{question}}
  Correct Answer: {{correctAnswer}}
  User's Answer: {{userAnswer}}

  Provide:
  1. A score (0-100)
  2. Feedback on the answer
  3. Key points the user missed
