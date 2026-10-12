# Pivot

Removing the secondary school product and keeping only the parts that carry over. Two foundations, both gating everything after them.

(basis: research/audience-and-market.md · the target audience is a different institution system, not a different age range, so the content and copy change completely while the code stays)

## Foundations

### 5. Delete GCE content, repoint the data model · needs a decision · GA
The product is secondary school shaped at every layer: twenty GCE A Level subjects, twenty three O Level programmes, blueprints, a question pipeline, mock authoring, countdown timers, and GCE copy in page metadata, navigation, email subjects and share text. Cameroon universities run internal semester exams with no public archive, so the past paper ingest pipeline has no feed and goes with the content.
**Done when:** no GCE, O Level or WAEC content or copy is reachable by a student or a search engine, the schema carries universities, faculties, courses, levels and years instead of exam levels and subjects, the admin question, blueprint and mock authoring is removed, and the migration runs clean against production without a reset.
- [ ] Design it (spec): `/solution-architect delete GCE content`

(basis: research/audience-and-market.md §1 and §2 · Buea and Bamenda are the only two Anglophone state universities and they serve two Anglophone regions, so the institution, faculty and year model is what content actually partitions by)

### 6. Generalise the exam and grading engine · needs a decision · GA
The fullscreen runner, the anti cheat rules, the tab violation handling, the short answer grader and the revision guides are the most expensive code in the repo and they work for university essays. The Paper 3 subject enum only holds ICT and Computer Science and the task types assume C, Pascal and Excel, so strip the level and language assumptions out and make them grade any course.
**Done when:** a mock for any course can be authored, sat fullscreen, graded with written feedback and a per question breakdown, and no model, enum, prompt or route in the engine names a school level or a programming language.
- [ ] Design it (spec): `/solution-architect generalise the exam and grading engine`

(basis: research/audience-and-market.md §3 · ninety three percent of this audience have cheated at university and seventy percent of fraud cases involved phones, so the integrity features are worth keeping rather than dropping with the GCE content)
