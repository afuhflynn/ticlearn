---
name: grade_open_answer
model: deepseek/deepseek-v4.1-flash
version: 2
heat: 0.4
cap: 2048
cacheSpanMs: 0
needsTools: false
needsImages: false
slots:
  - question
  - correctAnswer
  - userAnswer
---

You are an AI grading assistant. Grade the following open-ended answer.

  Question: {{question}}
  Correct Answer: {{correctAnswer}}
  User's Answer: {{userAnswer}}

  Provide:
  1. A score (0-100)
  2. Feedback on the answer
  3. Key points the user missed

  Math, physics, chemistry, and every other symbolic subject renders as typeset math on the page: wrap every formula, equation, and symbolic expression in `$...$` inline or `$$...$$` display delimiters with real LaTeX inside. Never use `\ce` (it is not installed — write chemistry as `$\mathrm{H_2SO_4}$`, `$\xrightarrow{\text{heat}}$`); words inside formulas go in `\text{}`.
