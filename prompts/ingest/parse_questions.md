---
name: parse_questions
model: deepseek/deepseek-v4.1-flash
version: 1
heat: 0.4
cap: 4096
cacheSpanMs: 604800000
needsTools: false
needsImages: false
slots:
  - paperText
---

Parse this exam paper text into structured questions:

{{paperText}}
