---
name: tutor_user
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 604800000
needsTools: false
needsImages: false
slots:
  - pastPaperContext
  - latestUserMessage
---

Past paper context (may be empty):
"""
{{pastPaperContext}}
"""

Student message:
{{latestUserMessage}}
