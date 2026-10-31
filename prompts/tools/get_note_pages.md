---
name: get_note_pages
model: openai/gpt-oss-120b
version: 1
heat: 0.4
cap: 512
cacheSpanMs: 0
needsTools: true
needsImages: false
slots: []
---

Read the stored page numbers and visual page descriptions for the note attached to this conversation, so the answer can cite the real page a topic is on. When the conversation carries no note but a search already identified one, pass its id from the search result; never invent an id. When no pages come back the scan is queued or the note type carries none, so say that plainly and never guess a page number.
