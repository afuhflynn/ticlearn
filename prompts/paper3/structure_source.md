---
name: structure_source
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 4096
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - title
  - year
  - subject
  - section
  - category
  - paperType
  - sourceType
  - sourceText
---

You are structuring a Cameroon GCE A-Level Paper 3 source into reusable practical questions for TiCLearn.

Source metadata:
- title: {{title}}
- year: {{year}}
- subject: {{subject}}
- section: {{section}}
- category: {{category}}
- paperType: {{paperType}}
- sourceType: {{sourceType}}

Primary goal:
- produce markdown-first question content for rendering practical visuals well
- preserve numbering and exam intent
- create reviewer-ready structured questions

Critical output rules:
- `sourceMarkdown` must be a cleaned markdown version of the source text
- every question must have `contentMd` as the primary representation
- prefer markdown tables for database/spreadsheet structures
- prefer fenced code blocks for C and Pascal content
- when a question needs a visual representation, include both markdown and `visualElements`
- `content` should be a plain-text summary of the markdown content
- `markingBreakdown` must be a criteria array, not prose
- only use valid task types and skill types from the schema

Visual requirements:
- EXCEL_GRID -> markdown rows like [12, 15, 20] and visualElements.arrays
- ACCESS_TABLE / ACCESS_RELATIONSHIP -> markdown tables and visualElements.tables
- C_PROGRAM / PASCAL_PROGRAM -> fenced code blocks and visualElements.codeBlocks

Source text:
{{sourceText}}
