# Exam

Slice 4, timed practice with AI grading. **Dropped on 2026-10-13.** The engine this slice sat on is being deleted rather than generalised, per [Pivot row 6](pivot.md#6-delete-the-exam-and-grading-engine--done--ga). The rows below stay for history; nothing here is planned work.

(basis: research/performance-and-database.md §1 · research/audience-and-market.md §3)

## Slice 4: Exams

### 26. Timed exam runner · dropped · GA
The fullscreen runner, the tab and fullscreen rules, the three second warning before auto submit, and the attempt record all exist and work. They need to work for any course rather than a fixed pair of programming subjects, and the exam payload must stop carrying the answer key to the phone before the exam starts.
**Done when:** a mock for any course can be started, fullscreen is enforced, leaving fullscreen warns then auto submits, a timer and per question navigation work on a phone, an interrupted attempt resumes or is marked abandoned, and the questions sent to the client never include expected answers, marking breakdowns or explanations.
Dropped with the exam engine, no spec written.

(basis: research/performance-and-database.md §1 · the mock route currently selects whole question rows with answers attached, which is both our largest avoidable payload and an integrity hole)

### 27. Grading feedback and result review · dropped · GA
The result page is the largest student facing screen in the app at over a thousand lines and it currently grades with AI feedback, shows the correct answers behind a plan gate, and offers a retake. This slice makes the feedback readable on a phone, gives the student something to act on rather than a score, and keeps the AI reading as a tutor rather than an answer machine.
**Done when:** a finished attempt shows a per question breakdown with written feedback in plain language, the student can see the marking scheme applied to their own answer, the page is readable on a phone from top to bottom, and the tutor hands off from the result with the specific next thing to revise.
Dropped with the exam engine, no spec written.

(basis: research/audience-and-market.md §3 · ninety three percent lifetime cheating rate means we cannot ship anything that reads as an answer machine; grading feedback that shows the reasoning is the differentiator, not the answer)
