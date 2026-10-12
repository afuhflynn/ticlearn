---
name: mock_mcq_section
model: gemini-2.5-flash
version: 2
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - count
  - programName
  - marksEach
---

Generate {{count}} fresh MCQ exam questions for {{programName}}. Each is worth {{marksEach}} mark(s). Difficulty should vary slightly across items. Rate each question difficulty as an integer from 1 (easy) to 5 (hard).
