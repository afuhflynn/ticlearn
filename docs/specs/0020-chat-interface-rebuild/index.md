# 0020. Rebuild the chat interface and stop gating the tutor on notes

**Date**: 2026-10-25
**Status**: Built, 2026-10-25. The live Blob upload proof, `/verify-release`, `/peer-review` and `/tech-writer` are still open.

## Summary

The chat shows raw tool calls, a permanent thinking shimmer, a composer that cannot stop an answer, and attachments that open as links. Every answer is also boxed in a bordered card with a name label above it, which reads as a quotation rather than a conversation. This spec replaces that with plain answers in a centred reading column, a bubble only on the student's own message, one collapsed activity line above each answer that expands into the steps and sources, a composer that grows, stops and previews its files, four starter cards on a fresh chat, and two or three suggested questions under the newest answer. It also moves chat file uploads to Vercel Blob and removes the assumption that a student must upload a note before Tip will teach, research or build a quiz. The work lands in slices, thread first, so each slice is visible and usable before the next begins.

## Requirements

**User stories**:
- As a student, I want to see what Tip is doing in plain words, so that a slow answer reads as work rather than a broken screen.
- As a student, I want to stop a long answer and keep what already arrived, so that a runaway generation does not cost me data.
- As a student, I want to attach a photo of a past paper and preview it before sending, so that I send the right question.
- As a student reading on a phone, I want the answer to read like a page of text rather than a boxed quotation, so that I can follow a long explanation.
- As a student who mistyped a question, I want to fix it and ask again without starting a new conversation, so that I keep the context I already built.
- As a student who does not know what to ask next, I want Tip to offer the obvious next questions, so that I keep going instead of staring at an empty box.
- As a student without uploaded notes, I want Tip to research a topic, explain it and build me practice, so that the tutor is not blocked on my library.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: While an answer is in flight, one collapsed line sits above the answer text from the moment send is pressed, naming the current step from the label set (`Searching the web for "coordinate geometry 2023"`, `Reading your notes`, `Opening "<title>"`, `Setting up your practice`, and so on), with a fallback label for any tool that has no entry. No tool identifier and no raw JSON ever reaches the screen.
- **AC-2**: Tapping the activity line expands it into the ordered steps and the sources the answer used, counted from `source-url` and `source-document` parts only, never from a tool result. The separate sources block under the answer is gone, so the answer text is the only thing below the line.
- **AC-3**: When the answer finishes, the line reads `Thought for Ns`, plus `Read N sources` when sources exist, and stays collapsed. The duration comes from the live turn only. A stored conversation expands to the same steps with no duration shown.
- **AC-4**: A step that fails (part state `output-error`) keeps its place with a plain sentence (for example `Couldn't reach the web. Answering without it.`) and a closed `Technical details` disclosure holding that part's `errorText`. The answer still streams.
- **AC-5**: The text area grows with its content up to a maximum height, then scrolls inside itself, and shows no browser resize handle. Enter sends with a fine pointer, Shift Enter inserts a newline, and Enter inserts a newline on a coarse pointer.
- **AC-6**: While an answer streams, the send control is a stop control and is reachable. Stopping saves the text that already arrived, marks that answer stopped, and offers a retry that replaces that answer, addressed by its assistant message id, instead of appending a second one. A stop before the first token arrives saves no assistant message at all.
- **AC-7**: An attachment opens a preview on tap (a lightbox with zoom for images, a preview sheet for documents), never a new tab. Each attachment removes on its own, the count matches the list exactly, overflow collapses into a `+N` chip, and a file's size shows before send.
- **AC-8**: A fresh chat shows four starter cards (`Solve a past paper`, `Explain my notes`, `Quiz me`, `Plan my revision`). Tapping one fills the composer and focuses it without sending. The cards are gone once the conversation has a message.
- **AC-9**: Chat files upload from the browser straight to Vercel Blob with a short lived token from our own route. The route requires a session, allows only the declared types and sizes (8 MB image, 16 MB PDF or DOCX, 4 MB text), and issues a token scoped to the path `chat/<userId>/` that expires within the minute. The composer stays usable while a file uploads, each file shows its own progress, and a file that fails shows a plain error with a retry and blocks send until it is retried or removed.
- **AC-10**: A paste that would take the message past 6000 characters is offered as a text attachment with a `Show in text field` reversal. If the provider rejects a text file part, the paste stays in the composer with a plain notice and its character count.
- **AC-11**: An unsent draft survives leaving and returning to the same conversation within the session, and is gone when the tab closes.
- **AC-12**: A conversation started from a note names that note in the thread, sends its summary, key points and the first 4000 characters of extracted text to the model, and the note tools can read the rest on request.
- **AC-13**: Tip answers, researches and builds a quiz with no note at all: the prompt no longer asks for one, `createQuiz` accepts a missing `noteId` and stores a null one with the topic as the title (the `Quiz.noteId` column is already nullable, so only the tool schema changes), and a vague research request gets one short scoping question before the search.
- **AC-14**: The composer carries one quiet line naming what Tip can already use (web search, the student's notes, quizzes and progress). The landing's three chips are gone, and its copy and starters no longer lead with notes.
- **AC-15**: Deleting a conversation deletes its Blob files. An attachment whose URL no longer resolves shows a plain notice in place of a broken file.
- **AC-16**: When the daily allowance is spent, the composer is replaced by a plain line naming the reset time and a link to the plans, and the thread stays readable.
- **AC-17**: A dropped connection mid answer leaves the activity line with a plain failure step and the retry bubble, and nothing already streamed disappears.
- **AC-18**: The activity line carries one polite live region whose text changes only when the step changes, and the running duration is `aria-hidden` so it is never announced per second. Every control in the composer and the attachment strip measures at least 44 by 44 pixels, verified in the DOM at the 375 pixel width. With `prefers-reduced-motion: reduce` set, the skeleton pulse stops and the disclosure opens with no animated height.
- **AC-19**: The content security policy allows the Blob host in `img-src`, in `connect-src` for the direct upload connection, and in `frame-src` for the PDF preview, and adds no other origin.
- **AC-20**: An answer renders as plain text with no border, no background and no corner radius, filling a centred reading column capped at 48rem. Only the student's own message is a bubble, keeping the primary background at the right edge of that column. The Tip and Study assistant label row above each answer is gone, and every corner still drawn uses the `--radius` token, never a bespoke value.
- **AC-21**: Each message carries its own actions. An answer offers Copy, Regenerate and Make a quiz from this. The student's message offers Copy and Edit. On a coarse pointer the actions are always visible, on a fine pointer they appear on hover or keyboard focus, each is at least a 44 pixel target with an accessible name, Regenerate replaces the answer in place under the same rule as retry, and Make a quiz from this fills the composer and focuses it without sending.
- **AC-22**: Edit loads the message text into the composer with an always visible line saying everything after it will be replaced. Sending updates that message, removes every message after it, and regenerates from there. Nothing branches and no version arrows are drawn.
- **AC-23**: The static suggestion row above the composer is gone. Under the newest answer only, Tip offers two or three suggested questions as tappable chips, written in the student's own voice and anchored in what the answer just said. Tapping one sends it immediately, and the chip carries a send affordance so it never reads as a text field. Older answers in history carry no chips, and the fresh-chat starter cards are unchanged.
- **AC-24**: The questions come from one `suggestReplies` tool that the model calls at the end of a substantive answer. The server validates the output before storing it: two or three items, each 60 characters or fewer, no markdown and no duplicates. When the tool does not run, no chips are drawn and no suggestion is ever invented on the client. The tool never appears as a step in the activity line, and a scoping question from Tip renders its own options as the same chips.

## Decision

**Chosen option**: Rebuild the thread around one activity line and de-gate the tutor in the same slice, with chat uploads moving to Vercel Blob.

One disclosure surface per answer, one reading surface where the answer is plain text and only the student's own message is a bubble, one composer that behaves like the chat products students already use, and a tutor that works with or without a note. Reasoning and the options weighed are in [rationale.md](rationale.md).

**Implementation skills**: `vercel-cli` (`vercel/vercel`, `.agents/skills/vercel-cli/`) · `vercel` (`vercel-labs/emulate`, `.agents/skills/vercel/`) · `uploadthing` (`terminalskills/skills`, `.agents/skills/uploadthing/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

### Message presentation

The thread becomes a reading column. The answer is text, and the student's own message is the only thing that looks like a message.

| Element | Rule |
|---|---|
| Reading column | `ConversationContent` is centred and capped at 48rem with `px-4` and a `gap-6` rhythm. Below the cap it is full width, so a phone is unchanged |
| Answer | no container at all: no border, no background, no radius, `w-full` inside the column. It reads as the page, not as a quotation |
| Student message | one bubble: primary background, primary foreground, a radius from the `--radius` token, right aligned, capped at 85 percent of the column |
| Name label | removed. Tip is named once in the chat header, and the bubble or its absence tells the student who spoke |
| Actions | one row under each message, from the existing `MessageActions` and `MessageAction` primitives |
| Thinking placeholder | the activity line from **AC-1**, never a bubble |
| Failure | a plain notice inside the column with a Try again button, never a bubble |

The mechanism stays where it is: `components/ai-elements/message.tsx` keeps its `is-user` and `is-assistant` group selectors, and the assistant branch loses its card classes. Today that file also draws bespoke corners (`rounded-2xl`, `rounded-br-md`) while the design system says `--radius` is the only corner knob, so this change removes drift rather than adding it.

Action set per role:

| Role | Actions | What each does |
|---|---|---|
| Answer | Copy | copies the answer markdown |
| Answer | Regenerate | replaces this answer in place, the same rule as retry in **AC-6** |
| Answer | Make a quiz from this | fills the composer with `Quiz me on this` and focuses it, never sends |
| Student | Copy | copies the question text |
| Student | Edit | loads the text into the composer and arms the replace warning from **AC-22** |

### Suggested questions

The static row above the composer goes. Suggestions become part of the answer.

| Rule | Value |
|---|---|
| Where | under the newest assistant message only, above the message actions |
| How many | two or three, never four |
| Source | one `suggestReplies` tool call at the end of a substantive answer |
| Voice | the student's own words, so `Explain the chain rule with an example`, never `I can explain the chain rule` |
| Length | 60 characters or fewer, one line on a 360 pixel screen |
| Tap | sends the text immediately |
| Shape | a chip with a leading send arrow, so it never reads as a text field |
| History | none. A reloaded conversation shows the answer without chips |
| Scoping | when Tip asks its one scoping question, its options render as the same chips |
| Absent | when the tool does not run, nothing is drawn and nothing is invented |

The `suggestReplies` tool is silent. It is real work for the model but it is not a step a student should see, so the activity line filters it out alongside the reasoning.

Why a tool and not a second route: it rides the turn that is already open, so it costs one step and a few tokens rather than a whole extra model call per answer. That matters on a metered allowance. The trade is that the model decides when suggestions are worth offering, so a one line reply carries none.

### Data model sketch

| Entity | Field | Type | Change |
|---|---|---|---|
| `ChatMessage` | `stoppedAt` | `DateTime?` | new, set when the student stops the stream |
| `ChatMessage` | `content`, `parts` | `String`, `Json` | updated in place when a message is edited |
| `ChatMessage` | rows after an edited message | existing rows | deleted, no branch column and no parent pointer |
| `ChatMessage` | `parts` | `Json` | unchanged shape, new file parts carry Blob URLs and a `tool-suggestReplies` part carries the chips |
| `ChatConversation` | `noteId` | `String?` | already exists, now read on the send path |
| `ChatConversation` | `note` | `Note?` relation | read only, `id` and `title` for the thread line |
| `Quiz` | `noteId` | `String?` | already nullable, unchanged. Only the `createQuiz` tool schema changes |
| Client only | draft | `sessionStorage`, key `ticlearn-chat-draft:<conversationId>` | not persisted to the database |
| Client only | activity duration | memory while streaming | not persisted |

No new table, no new enum, no attachment table. Files stay AI SDK file parts inside `parts`, which is why a stored attachment needs no join.

### State transitions

- **Answer**: `submitted` → `streaming` → `complete` | `stopped` | `failed`. `stopped` is the only state that needs storage, through `stoppedAt`.
- **Attachment**: `empty` → `uploading` → `uploaded` | `failed` → `sent`. A `failed` attachment blocks send until it is retried or removed.
- **Activity step**: `pending` → `running` → `done` | `failed`. Steps are derived from the part states the AI SDK already emits, never stored separately.
- **Composer**: `ready` → `submitted` → `streaming` (stop available) → `ready`. Uploading never removes the composer from `ready`.
- **Message edit**: `idle` → `editing` (the composer holds the text and the replace warning is visible) → `replaced` (that message is updated and every later message is removed) → `idle`. Cancelling the edit returns to `idle` with the draft it replaced.

### API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/chat/upload` | POST | client upload request from `@vercel/blob/client` | short lived upload token scoped to `chat/<userId>/`, allowed content types, maximum size, expiry | session required | 401, 413, 415 |
| `/api/chat/conversations/[id]` | GET | `cursor`, `limit` | conversation now includes `note { id, title }`, messages include `stoppedAt` | session and ownership | 401, 404 |
| `/api/chat/conversations/[id]` | DELETE | none | deletes the conversation and its Blob files | session and ownership | 401, 404 |
| `/api/ai/chat` | POST | messages, `conversationId`, optional `editMessageId` | unchanged stream, a saved stopped answer, and on an edit that message updated with every later message removed before the stream starts | session, plan limits, message ownership | 400, 401, 403, 404 |
| `/api/usage` | GET | none | unchanged, `chatDailyUsage.resetsAt` already present | session | 401 |

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Activity step label | the human phrase per tool | static map in `lib/chat/activity-labels.ts`, keyed by tool name |
| Unmapped tool label | the fallback phrase (`Working`) plus a server log line | the fallback entry in the same map, logged once per unknown tool name on the route |
| Activity step detail | the echoed query or note title | the tool part `input` the SDK already sends |
| Failed step sentence | the plain sentence and the details body | the part state `output-error` and its `errorText` |
| Step order | the order shown | the order of `message.parts` |
| `Thought for Ns` | the duration | client clock, submit to last part, memory only |
| `Read N sources` | the count | number of `source-url` and `source-document` parts in the message, never a tool result |
| Source rows | title and link | the same source parts |
| Attachment count | the number on screen | the one attachments list the strip draws from, never a second counter |
| File size before send | the human size | the `File` object the student picked |
| Attachment preview | the image or document | the file part `url` |
| Action labels and icons | `Copy`, `Regenerate`, `Make a quiz from this`, `Edit` | one constant in `components/chat/constants.ts`, drawn with the `lucide` icons already in the file |
| Quiz prefill | the text `Quiz me on this` | the same constant, written into the composer and never sent |
| Edited message | the replacement text | the composer value at send, with `editMessageId` naming the row to update |
| Reading column width | the 48rem cap | one class on `ConversationContent`, not repeated per message |
| Upload path | the Blob key | `chat/<userId>/<random>` issued by `/api/chat/upload`, expiry of 60 seconds |
| Note name in thread | the title | `ChatConversation.note.title` through the messages read |
| Note context | summary, key points, first 4000 characters | `Note.summary`, `Note.keyPoints`, `Note.extractedText` |
| Stopped marker | `Stopped` line | new `ChatMessage.stoppedAt` |
| Allowance reset | the time in the limit line | `chatDailyUsage.resetsAt` from `useUsage`, already returned by `/api/usage`, formatted with the existing Africa/Douala formatter in `lib/utils.ts` |
| Capability line | the sentence | one constant in `components/chat/constants.ts` |
| Starter cards | the four labels and prompts | one constant in `components/chat/constants.ts` |
| Suggested questions | the chip text | the `suggestReplies` tool output, validated and capped on the server |
| Chip tap | the message sent | the chip's own text, verbatim, with no rewrite on the client |
| Scoping options | the choices under a scoping question | the same tool output, attached to the question that asked it |
| Draft | the unsent text | `sessionStorage` under the conversation key |

### Key invariants

- Every tool name maps to exactly one human label in one module. No component may print a tool identifier.
- Only the student's message carries a container. An answer with a border, a background or a radius is a bug, and the reading column is defined once on the content wrapper rather than per message.
- An edit removes every later message on the server before the stream starts, so a reload can never resurrect a turn the student replaced.
- A suggestion has a `tool-suggestReplies` part behind it or it does not exist. Nothing on the client invents, rewrites or reorders a chip, and a tap sends the stored text verbatim.
- Chips render on the newest answer only, and the `suggestReplies` tool is filtered out of the activity steps.
- A tool name missing from the map renders the fallback label and logs once, so a new tool is never silent and never leaks its identifier.
- The source count and the source rows are read from `source-url` and `source-document` parts only. A tool result is never counted as a source.
- The attachment count and the attachment strip read the same list. A second counter is a bug by construction.
- A duration is never stored and never invented for history.
- A stopped answer never renders as a complete answer.
- The note excerpt never exceeds 4000 characters on the send path.
- The composer state mirrors the server limit, it never enforces it. The route remains the gate.
- Every stored file part is rendered from its `url`, whatever origin it carries. Availability is decided by the load, not by the origin.

### Security model

- `/api/chat/upload` requires a session, keeps today's type and size ceilings (8 MB image, 16 MB PDF or DOCX, 4 MB text), namespaces the path with the user id, and is rate limited.
- Blob files are public with unguessable URLs, the same exposure as today's UploadThing links. This is an accepted risk, with the private access upgrade recorded in Follow-up.
- Note context is read only when the conversation belongs to the signed in student and the note belongs to the same student.
- The delete route removes only the files named inside that student's own conversation.
- An edit names one message id. The route updates it and removes later rows only when that message belongs to the signed in student's own conversation, and answers 404 otherwise.
- A suggestion is model output produced after reading pages on the web, so it is treated as untrusted: length capped, markdown and links stripped, duplicates removed, and never more than three. A chip sends its own short text and nothing else, so a planted suggestion cannot become a link or a long instruction.
- No new personal data is stored. The chat already holds the student's questions and files.

### Configuration required

- `BLOB_READ_WRITE_TOKEN` (or `VERCEL_OIDC_TOKEN` with `BLOB_STORE_ID`): the Blob store credential. Document in `.env.example`, never in client code.
- `next.config.ts`: add the Blob host to `img-src`, to `connect-src` and to `frame-src` in the content security policy, and to `next/image` remote patterns if the lightbox uses `next/image`. `frame-src` is what lets the PDF preview frame a Blob URL.

### Critical test scenarios

- Happy path: send a question with a note attached, watch the activity line run and settle, expand it and read the steps and sources, verifies **AC-1**, **AC-2**, **AC-3**, **AC-12**.
- Happy path: read a long answer on a phone and on a wide window, confirm the answer has no container, the column stops at 48rem, only the question is a bubble, and the name label is gone, verifies **AC-20**.
- Happy path: copy an answer, regenerate it, and tap Make a quiz from this to confirm the composer fills without sending, verifies **AC-21**.
- Happy path: edit a question three turns back, confirm the warning is visible before send, and confirm the later turns are gone on reload, verifies **AC-22**.
- Happy path: ask a research question, confirm two or three chips under the newest answer only, tap one and confirm it sends, then reload and confirm no chips remain, verifies **AC-23**.
- Failure case: the tool returns four suggestions, one of them over 60 characters and one duplicated, confirm the server keeps only the valid two and draws nothing when none survive, verifies **AC-24**.
- Happy path: attach a photo, watch it upload while typing, preview it, remove one of two and check the count, verifies **AC-7**, **AC-9**.
- Failure case: stop mid answer, reload, confirm the partial answer is marked stopped and retry replaces it, verifies **AC-6**.
- Failure case: a tool fails and a file upload fails, confirm the plain lines, the closed details and the blocked send, verifies **AC-4**, **AC-9**.
- Failure case: the provider rejects a text file part, confirm the paste stays with the notice and count, verifies **AC-10**.
- Permission case: a student with no note asks for research and then a quiz, confirm both work and that the quiz stores a null note, verifies **AC-13**.
- Permission case: an unauthenticated upload token request, confirm 401 and that no file lands in the store, verifies **AC-9**.
- Permission case: an edit naming a message in another student's conversation, confirm 404 and that no rows are removed, verifies **AC-22**.
- Accessibility: keyboard only through the message actions, the composer, the starter cards and the attachment strip, with a screen reader, verifies **AC-18**, **AC-21**.

## Build plan

Tracer Bullet. Slice one rebuilds the thread shell and puts the activity line through every layer, and ships it. Each later slice thickens one surface and stays usable on its own.

1. Message shell: strip the assistant card in `components/ai-elements/message.tsx` (no border, no background, no radius, `w-full`), cap `ConversationContent` at 48rem and centre it, keep the primary bubble on the student message with a `--radius` corner, delete the Tip and Study assistant label row, and turn the thinking and failure bubbles into plain lines inside the column. Copy actions on both roles. Satisfies **AC-20**, **AC-21**.
2. Add `lib/chat/activity-labels.ts` (one label map for all eleven tools, the ten that exist plus `suggestReplies`, with the query echo, a silent marker for `suggestReplies`, a fallback label and a log line for an unknown tool) and `components/chat/activity-block.tsx` (collapsed summary, expanded steps, duration, failed step with closed details, one polite live region, `aria-hidden` timer). Replace `ToolParts`, the `Reasoning` block and the `Sources` block in `chat-message-list.tsx` with it, above the answer text, and filter the parts it reads to tool parts and `source-*` parts only. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-18**.
3. Composer mechanics: auto grow to a maximum then internal scroll, `resize-none`, `enterKeyHint`, Enter and Shift Enter per pointer type, and the submit control wired to `stop()` while streaming. Satisfies **AC-5**, **AC-6**.
4. Stopped answers and the actions that rewrite history: migration `add_chat_message_stopped_at` (nullable column), save the partial answer in the route when the stream is aborted, mark it in the thread, and make retry and Regenerate replace an answer by assistant message id. An abort before the first token writes no assistant message. Add the optional `editMessageId` to `POST /api/ai/chat`, which updates that message and deletes every later row in one transaction before the stream starts, with ownership checked. Add the composer's replace warning and the Make a quiz from this prefill. Satisfies **AC-6**, **AC-21**, **AC-22**.
5. Blob storage cutover: add `@vercel/blob`, create `/api/chat/upload` with `handleUpload` and its session, type, size and 60 second expiry checks scoped to `chat/<userId>/`, prove that route and a real 16 MB PDF end to end, then switch the composer to `upload()` from the client, keep the composer usable during upload, per file progress, failed file blocks send, delete Blobs in the conversation delete route as a best effort that logs every failure and never fails the delete, extend the content security policy for `img-src`, `connect-src` and `frame-src`. Satisfies **AC-9**, **AC-15**, **AC-19**.
6. Attachment strip and previews: 64 pixel thumbnails, name and human size, per item remove, `+N` overflow chip, image lightbox and document preview sheet on the existing Radix Dialog (the PDF sheet frames the Blob URL, which is why `frame-src` is set in task 5), plain notice on a URL that no longer resolves. Satisfies **AC-7**, **AC-15**.
7. Long paste conversion at 6000 characters with the `Show in text field` reversal, and the plain notice fallback when a text file part is rejected. Satisfies **AC-10**.
8. Draft persistence in `sessionStorage` keyed per conversation, reusing the `pending-message.ts` pattern, and holding the draft an edit replaced until the edit is cancelled. Satisfies **AC-11**.
9. Note context and de-gating: read the conversation's note on the send path and pass summary, key points and the 4000 character excerpt; return `note { id, title }` from the messages read and name the note in the thread; rewrite the two prompt lines; make `createQuiz` `noteId` optional with a null stored note and the topic as title; add the one scoping question rule for vague research. Satisfies **AC-12**, **AC-13**.
10. Copy and states: the one capability line, the four starter cards replacing `QUICK_ACTIONS` and the landing's three Zap chips, the landing copy, the spent allowance line with the reset time and plan link, and the connection failure wording. Satisfies **AC-8**, **AC-14**, **AC-16**, **AC-17**.
11. Suggested questions: add `suggestReplies` to `lib/ai/tools.ts` with its schema and the server side validation (two or three, 60 characters, no markdown, deduplicated), filter it out of the activity steps, render the chips under the newest answer with a send affordance, delete the static `Suggestions` row from `chat-thread.tsx`, and render the scoping question's options as the same chips. Satisfies **AC-23**, **AC-24**.

## Consequences

**Positive**:
- A student sees a plain sentence instead of a developer console, and can stop a runaway answer on a metered connection.
- The composer stops losing drafts and stops freezing while a photo uploads.
- Chat files no longer pass through a serverless function, so a 16 MB PDF uploads at the speed of the connection.
- The tutor works for a student who has uploaded nothing, which is most students on day one.
- A student who does not know what to ask next gets two or three concrete questions drawn from the answer they just read, instead of a static row that ignores the conversation.

**Negative / tradeoffs**:
- A storage cutover lands inside a UI slice. It carries a new credential, a content security policy change and a delete path that can orphan files if it fails.
- A chip sends on tap, so a mistap spends one of the student's metered daily messages and there is no undo. The send arrow and the short text are the only protection.
- The chips cost one extra tool step at the end of an answer, so they arrive after the text, and a model that declines to call the tool produces none.
- Public Blob URLs are readable by anyone holding the link. That is today's exposure, now written down.
- Attachments sent through UploadThing are no longer maintained. They render while the URL resolves and show a notice when it does not.
- History shows the steps without a duration, because no timestamp is stored.
- Editing a question is destructive. The turns after it are deleted, not branched, so a student who edits the wrong message loses what followed. The warning is always visible rather than shown once in a dialog.
- The 6000 character paste conversion depends on the provider accepting a text file part, which the build must prove early.

**Neutral**:
- One nullable column, one migration, one new route.
- The message shell change is a class change on two primitives plus one wrapper, not a component rewrite. It also removes the bespoke corner values that already drifted from the design system.
- The activity line becomes the single place tool disclosure lives, so a new tool needs one label entry and nothing else.
- The composer's Enter behaviour is unchanged from today, and now covered by a test.

## Follow-up

- [ ] Prove the Blob path against a real store. `BLOB_READ_WRITE_TOKEN` is documented in `.env.example` but is not in `.env` yet, so `/api/chat/upload`, a 16 MB PDF and the delete cleanup are proven by the unit tests and the type checker only. Add the token, upload one 16 MB PDF, then delete the conversation and confirm the file is gone from the store.
- [ ] The app shell and navigation rebuild is its own scope feature (46), not part of this spec. It touches every authed page: one sidebar, one header, one toggle, and the conversation list inside the main sidebar.
- [ ] Full generative UI, where the model renders a component we did not design (a graph, a step list), is a different decision from generated suggestions and is not in this slice.
- [ ] A chip that sends on tap has no undo. If mistaps show up in the data, the next step is a short undo affordance on the sent message.
- [ ] Personalise one suggestion from the student's weakest topic once readiness data is available again. `lib/readiness.ts` was cut in spec 0014.
- [ ] Pull `origin/main` before building. This session is 5 commits behind and a teammate may have touched the chat files.
- [ ] Prove the text file part early. If the model provider rejects it, the paste falls back to the notice path and `AC-10` is verified against that.
- [ ] Firecrawl as the primary search provider is still scope feature 19. The code calls Tavily today, and this slice does not change it.
- [ ] Private Blob access is the upgrade path for student files. Revisit it when the storage slice lands, since it changes how the model reads an attachment.
- [ ] Retire the UploadThing store once its links stop mattering, and delete `lib/uploadthing.ts`, the `chatUploader` router entry and the `utapi` cleanup together.
- [ ] Record the four installed skills in the `## Agent skills` section of `AGENTS.md` (`vercel-cli`, `vercel` emulate, `uploadthing`, `vercel-react-best-practices`). Storage conventions belong in a storage area doc if one is created; the React performance rules belong at root.
- [ ] The official Vercel MCP server is optional and worth connecting for deploys and logs. It does not touch Blob objects.
- [ ] Check `MAX_PART_CHARS` in `app/api/ai/chat/route.ts` (8000) against the 6000 conversion threshold before changing either number.

## Migration plan

**Strategy**: strangler for storage, single deploy for the interface.
**Phases**:
0. Spike before any composer work: prove that the provider accepts a text file part (the long paste path), and prove the Blob token route with a real 16 MB PDF. Both are cheap and both can change the shape of a later task.
1. Ship the thread and composer slices with UploadThing still in place.
2. Add the Blob store, the token route and the new upload path behind the composer, then switch new uploads over. Old files stay where they are.
3. Ship the copy, starters, suggested questions and de-gating, then remove the UploadThing composer code once a week of new uploads has landed cleanly.
**Rollback**: reverting the storage phase restores the UploadThing composer path, and old files were never moved, so nothing needs undoing. Reverting the interface phase is a code revert with no data effect.
**Risks**: a Blob outage blocks new attachments while text chat keeps working; a wrong content security policy blocks every Blob image and every PDF preview; deleting a conversation during a partial upload can leave one orphaned file, which is accepted and logged rather than allowed to fail the delete.

## Rationale

Reasoning and the options weighed: see [rationale.md](rationale.md).
