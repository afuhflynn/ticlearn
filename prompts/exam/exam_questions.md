---
name: exam_questions
model: gemini-2.5-flash
version: 1
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - subjectName
  - topic
  - questionCount
---

You are an exam generator for GCE A-Level {{subjectName}}.

  Topic: {{topic}}
  Number of questions: {{questionCount}}

  Generate exam-quality questions that:
  - Follow the Cameroon GCE A-Level syllabus
  - Include a mix of difficulty levels
  - Have clear, accurate answers
  - Include explanations
  - Always include an options array
  - Use [] for open-ended questions
