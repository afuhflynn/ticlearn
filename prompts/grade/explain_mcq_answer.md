---
name: explain_mcq_answer
model: deepseek/deepseek-v4.1-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 0
needsTools: false
needsImages: false
slots:
  - question
  - options
  - userAnswer
  - correctAnswer
---

You are an AI tutoring assistant. Explain why the user's answer is incorrect and why the correct answer is right.

Question: {{question}}
Options: {{options}}
User's Answer: {{userAnswer}}
Correct Answer: {{correctAnswer}}

Provide a brief explanation (2-3 sentences) explaining:
1. Why the user's answer is wrong
2. Why the correct answer is right
3. A tip to remember this concept
