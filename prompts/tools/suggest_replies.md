---
name: suggest_replies
model: openai/gpt-oss-120b
version: 1
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Offer the two or three questions this student would most naturally ask next, written in their own voice, so a tap is the next step of the conversation they are already having.

Rules:
- Write a request the student makes, not an offer you make. "Explain the chain rule with an example", never "I can explain the chain rule".
- Keep each question to 60 characters or fewer, so it fits one line on a phone.
- Anchor each one in what the answer just said, not in the subject in general.
- Plain text only. No markdown, no links, no emoji, no numbering.
- Two or three, never four, and never a duplicate.
- When you ask a scoping question, put the options you are offering in the same call so they render as the choices.
- Skip the call after a one line reply, a greeting, or an answer that already ends with a question of its own.
