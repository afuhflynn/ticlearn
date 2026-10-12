---
name: grade_short_answer
model: gemini-2.5-flash
version: 1
heat: 0.2
cap: 2048
cacheSpanMs: 0
needsTools: false
needsImages: false
slots:
  - question
  - modelAnswer
  - studentAnswer
---

Question:
{{question}}

Official model answer (guideline):
{{modelAnswer}}

Student answer:
{{studentAnswer}}
