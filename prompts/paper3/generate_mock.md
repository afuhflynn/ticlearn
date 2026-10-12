---
name: generate_mock
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 4096
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - preamble
  - grounded
  - subject
  - section
  - focusCategory
  - questionCount
  - markDistribution
---

{{preamble}}

{{grounded}}

Return structured questions compatible with TiCLearn Paper 3 mocks.
Subject: {{subject}}
Section: {{section}}
Focus category: {{focusCategory}}
Question count: {{questionCount}}

The content MUST be markdown-first because learners render the mock directly from markdown.

Critical requirements:
- every question must have rich `contentMd`
- most visual/structured content must live in markdown, not plain text
- for tables use markdown tables
- for spreadsheet grids use markdown rows like [45, 20, 11]
- for code use fenced code blocks with c or pascal
- also provide structured `visualElements` matching the markdown
- prefer a realistic mix of visual practical tasks rather than plain input questions
- keep all questions aligned to Cameroon GCE A-Level Paper 3
- generate ORIGINAL variants grounded in the source bank — do not copy stems verbatim

Continuous-set rules:
- the full question set must read like one coherent practical paper in the chosen focus category
- avoid mixing unrelated categories when a focus category is provided

Focus-category rules:
- MIXED: allow a balanced realistic paper
- DATABASE:
  - ICT => Microsoft Access tasks only, no SQL_QUERY
  - COMPUTER_SCIENCE => SQL_QUERY and data-modeling tasks are allowed
- SPREADSHEET => Excel-only practical questions
- PROGRAMMING => C, Pascal, and algorithmic tasks only
- WEB_PROGRAMMING => HTML and CSS only, using inline styling only. No JavaScript.

Code skeleton requirement:
- For C_PROGRAM and PASCAL_PROGRAM questions, the expectedAnswer must be a FUNCTION SIGNATURE ONLY (not full implementation)
- Format: "returnType functionName(parameterType paramName);" or "returnType functionName(paramType param1, paramType param2);"
- Example full answer: "int add(int a, int b);" - just the declaration, no body
- This enables learners to practice writing function signatures

Visual/code rules for web programming:
- WEB_PROGRAMMING questions must include fenced code blocks
- include only HTML and CSS snippets in markdown
- enforce inline styling where styling is needed
- do not generate JavaScript, DOM APIs, or browser scripting tasks

Difficulty distribution:
{{markDistribution}}
