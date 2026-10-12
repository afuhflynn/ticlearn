---
name: exam_review_chat
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 4096
cacheSpanMs: 0
needsTools: false
needsImages: false
slots:
  - systemSection
  - conversationHistory
  - latestMessage
---

{{systemSection}}

Recent conversation:
{{conversationHistory}}

User's latest message: {{latestMessage}}

Respond as TiC with helpful guidance. Keep responses focused and educational.
