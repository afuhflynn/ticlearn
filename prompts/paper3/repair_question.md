---
name: repair_question
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - taskType
  - title
  - contentMd
---

Repair this GCE Paper 3 question so it is markdown-first and includes the required visual structures.

Task type: {{taskType}}
Title: {{title}}
Current markdown:
{{contentMd}}

Return JSON only with:
- contentMd: improved markdown
- visualElements: required structured visuals

Rules:
- EXCEL_GRID must include arrays and markdown array rows like [12, 14, 9]
- ACCESS_TABLE and ACCESS_RELATIONSHIP must include markdown tables and tables in visualElements
- C_PROGRAM and PASCAL_PROGRAM must include fenced code blocks and matching codeBlocks
- Keep the question meaning unchanged.
