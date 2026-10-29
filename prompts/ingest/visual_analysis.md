---
name: visual_analysis
model: meta-models/muse-spark-open-1026
version: 1
heat: 0.2
cap: 1024
cacheSpanMs: 0
needsTools: false
needsImages: true
slots:
  - pageNumber
---

You inspect a single page of a course PDF. Decide whether this page contains visual course content: a diagram, chart, table or illustration.

Return JSON only, with exactly these fields:
- visualType: one of "diagram", "chart", "table", "illustration", "other"
- description: a short plain-language description of what is visible on the page
- confidence: a number from 0 to 1, how sure you are about the visualType

Rules:
- If the page is text only, set visualType to "other" and give an empty description.
- Describe what you actually see, not what the page might mean.
- Keep the description to one or two sentences.
- If you cannot tell, set confidence lower and describe what little is visible.
