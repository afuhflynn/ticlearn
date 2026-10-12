---
name: grounded_question_batch
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 4096
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - count
  - focusCategory
  - difficulty
  - mockTitle
  - pastPaperContext
  - authorNotes
---

Create exactly {{count}} **original** practice questions for GCE Paper 3.
Focus category: {{focusCategory}}
Difficulty: {{difficulty}}
{{mockTitle}}
Rules:
- Questions must be original variants, NOT copies of the bank below.
- Ground style, difficulty, command words, and mark patterns in the source bank.
- Prefer markdown-rich stems where tables, grids, or code blocks are natural.
- For programming items: no pointers, malloc/free, or pointer parameters.
- For web items: HTML/CSS only, inline styling, no JavaScript.

Past paper / approved question bank:
"""
{{pastPaperContext}}
"""

{{authorNotes}}
