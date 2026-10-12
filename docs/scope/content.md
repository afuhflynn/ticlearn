# Content

Slice 3, notes and quizzes. This is the loop the product is built around: the student uploads their own notes, learns from them with the tutor, then turns them into practice. Five features.

(basis: research/design-reference.md §2 and §8 · research/stack-and-storage.md §4 · research/performance-and-database.md)

## Slice 3: Notes and quizzes

### 21. Note upload experience · needs a decision · GA
Students do not have soft copies of anything, so what they have is a photograph of a slide or a photocopy. Upload currently works through UploadThing with no resumable transfer, so a connection that dies at eighty percent loses the file, and on a phone shared with someone else the photo ends up in the gallery where it can be seen. The best studied pattern is a strip of thumbnails inside the composer with a preview on tap and no gallery save.
**Done when:** a photo of a slide can be captured, uploaded with visible progress, previewed on tap, and resumed rather than restarted if the connection drops, one grouped progress indicator covers a multi file upload, the extracted size and its rough cost in XAF are shown before download, and captured images do not land in the device gallery.
- [ ] Design it (spec): `/solution-architect note upload experience`

(basis: research/design-reference.md §8 · Material3 guidance is determinate once bytes arrive, one grouped indicator for multiple files, and a stated size cap; research/chat-experience.md §6 for the attachment strip)

### 22. Storage move to Neon object storage · needs a decision · GA
Neon object storage is generally available, S3 compatible, and includes five hundred gigabytes of egress per project, which against a student base paying for data by the gigabyte is roughly a hundred times cheaper than UploadThing on egress. It has no Africa region, so the latency from a Cameroonian network has to be measured before the bulk moves.
**Done when:** resumable uploads are in use for large files, past papers and notes live in Neon object storage, avatars and image transforms stay on UploadThing, egress cost per student is measured on a real Cameroonian connection, and the migration of existing objects is complete and reversible.
- [ ] Design it (spec): `/solution-architect storage move to Neon object storage`

(basis: research/stack-and-storage.md §4 · measured at about 105 XAF a month for a thousand students against about 5,857 for UploadThing, purely on egress)

### 23. Quiz generation flow · needs a decision · GA
Today a quiz is generated in one shot with settings chosen up front, which ignores the strongest thing we have: the student has just been talking to a tutor about their notes and knows exactly what they do not understand. The flow should let the student decide, after learning, what to be tested on.
**Done when:** a student can open a quiz on a specific note, topic, concept or course they discussed with the tutor, choose the format and length, generate and revise the questions before starting, and every question traces back to the part of their own material it came from.
- [ ] Design it (spec): `/solution-architect quiz generation flow`

(basis: research/audience-and-market.md §3 · students mostly skip tutorials and self study is the de facto mode of study, so generating practice has to be fast and specific rather than a form)

### 24. Upload limits and usage tracking · needs a decision
The plan gates a limits table, the usage route returns per plan counters, and the composer shows a running attachment count, but none of it is consistent. Students on a metered connection need to see what they have used before they hit a wall, not after.
**Done when:** every limit a plan carries has one source of truth, the current usage and what is left is visible where the action happens, hitting a limit explains what the limit is and what upgrading gives, and an upload that would exceed the limit is caught before bytes leave the phone.
- [ ] Design it (spec): `/solution-architect upload limits and usage tracking`

### 25. Offline packs and low data mode · needs a decision
Every credible competitor in this market leads with offline, and with data at 1.63 US dollars a gigabyte against a budget of two to five dollars a month, downloading once and studying anywhere is the actual feature rather than a nice extra. Full offline is later work; the groundwork is not.
**Done when:** pages a student has already opened keep working without a connection, the size of anything downloadable is shown before download with its rough cost, a course can be downloaded as a pack and read offline, and the app says plainly what is available offline rather than failing quietly.
- [ ] Design it (spec): `/solution-architect offline packs and low data mode`

(basis: research/audience-and-market.md §2 and §6 · the offline packs are deliberately after the core loop, since a pack of nothing is not useful, but the size disclosure is cheap and unclaimed ground)
