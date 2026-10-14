---
name: chat_title
model: openai/gpt-oss-120b
version: 1
heat: 0.4
cap: 512
cacheSpanMs: 604800000
needsTools: false
needsImages: false
slots:
  - userMessage
---

Generate a short (max 50 characters), descriptive title for this conversation based on the user's first message.
The title should be concise and capture the main topic.
Do not use quotes or special characters in the title.

User message: "{{userMessage}}"

Respond with only the title, nothing else.
