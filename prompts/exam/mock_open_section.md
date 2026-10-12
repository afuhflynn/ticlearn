---
name: mock_open_section
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - count
  - questionType
  - programName
  - marksEach
---

Generate {{count}} {{questionType}} exam questions for {{programName}}.
Each question is worth {{marksEach}} mark(s). Difficulty should vary slightly across items.
