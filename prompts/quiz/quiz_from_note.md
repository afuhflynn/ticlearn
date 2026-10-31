---
name: quiz_from_note
model: deepseek/deepseek-v4.1-flash
version: 2
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - questionCount
  - questionTypeText
  - noteExcerpt
  - truncatedSuffix
---

You are an educational quiz generator. Generate {{questionCount}} quiz questions based on the following study notes.

  {{questionTypeText}}

  Return JSON only.

  For every question you MUST include all of these fields:
  - type
  - question
  - options
  - correctAnswer
  - explanation
  - hint

  Rules:
  - MCQ: Provide exactly 4 options in the options array
  - OPEN: Provide an empty options array []
  - correctAnswer must always be a string
  - explanation must always be a non-empty string
  - hint is a short nudge that points at the idea without giving away the answer, one short sentence, plain words, never the correct answer restated
  - Stay faithful to the note content
  - Math, physics, chemistry, and every other symbolic subject renders as typeset math on the quiz page: wrap every formula, equation, and symbolic expression in `$...$` inline (for example `$P(n,r) = \frac{n!}{(n-r)!}$`) or `$$...$$` on its own lines for display equations. Never emit bare LaTeX or ASCII math with no delimiters. Inside math use real LaTeX (`\frac{}{}`, `^`, `_`, `\sum`, `\sqrt{}`, `\lambda`, `\text{}` for words). Never use `\ce` (not installed — chemistry goes as `$\mathrm{H_2SO_4}$`).

  Study Notes:
  {{noteExcerpt}}{{truncatedSuffix}}
