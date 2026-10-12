---
name: revision_guide
model: gemini-2.5-flash
version: 1
heat: 0.35
cap: 4096
cacheSpanMs: 2592000000
needsTools: false
needsImages: false
slots:
  - focus
  - pastPaperContext
  - instructorNotes
---

Produce a **super-detailed** revision guide suitable for export to a multi-page PDF (target well over three pages when rendered).

{{focus}}

**Past paper and question bank (PRIMARY CONTEXT):**
"""
{{pastPaperContext}}
"""

{{instructorNotes}}
**Output rules:**
- Markdown only. No preamble ("Certainly").
- No emoji.
- Prioritise completeness and exam-style depth over brevity.
