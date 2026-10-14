---
name: study_brief
model: deepseek/deepseek-v4.1-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 2592000000
needsTools: false
needsImages: false
slots:
  - excerpt
---

Analyze the following study notes and return a concise study brief.

Requirements:
- summary: 2-3 sentences, max 500 characters
- topics: 3-5 short topic labels
- keyPoints: 3-6 concrete learning points written as complete sentences
- stay faithful to the source material
- avoid generic filler like "general overview"

Notes:
{{excerpt}}
