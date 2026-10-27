# 0024. Chat interface redesign

**Date**: 2026-10-27
**Status**: In Progress

## Summary

The chat surface is restyled to a clean, modern look inspired by the reference screenshots while keeping TiCLearn's own theming. The thread becomes a centred reading column with plain answers and only the student's message as a bubble. The composer grows, stops, previews files and shows per-file upload progress. Four starter cards greet a fresh chat, and two or three suggested questions appear under the newest answer. A question can be edited in place. The sidebar inside the chat layout is restyled to match, without changing the shell's information architecture (that stays with feature 46). Attachments still upload straight to Vercel Blob through a short lived token route, and Tip still works with or without an uploaded note. This is a fresh spec separate from 0020, which described the behaviour surface already built. Lands as one Tracer Bullet slice through the chat page and its components.

## Context

The existing chat surface (spec 0020, already built) works but reads as a developer tool. A bordered card wraps each answer, the composer is a fixed block, attachments open as links, and there is no stop control reachable while streaming. The student wants Tip to feel like a study assistant they hire to answer questions and build practice, not a console. The reference screenshots show a centred reading column, one bubble on the student's message, a growable composer with attachment states, suggested questions under answers, and tool execution shown as plain steps. The constraints stay the same: phone first on metered data, no spinner as a loading state anywhere, Tokens only from app/globals.css, shadcn/ui and Radix as the component base, and Vercel Blob for chat files. The scope is the chat route group only — chat-sidebar, chat-header, chat-thread, chat-message-list, chat-composer, activity-block, file-preview, suggested-replies, allowance-notice, and ai-elements. No other app page is touched. The sidebar's information architecture (one sidebar, one header, one toggle) is feature 46 and is not changed here.

## Requirements

**User stories**:
- As a student, I want to read Tip's answer as plain text in a centred column, so a long explanation reads like a page not a quotation.
- As a student, I want to stop a long answer and keep what arrived, so a runaway generation does not cost me data.
- As a student, I want to attach a photo of a past paper and preview it before sending, so I send the right question.
- As a student on a phone, I want only my own message to look like a bubble, so I can tell who spoke at a glance.
- As a student who mistyped, I want to fix my question in place without starting a new conversation, so I keep the context.
- As a student who does not know what to ask next, I want Tip to suggest the obvious follow up questions, so I keep going instead of staring at an empty box.
- As a student without uploaded notes, I want Tip to research, explain and build practice, so the tutor is not blocked on my library.

**Acceptance criteria** (the contract, each criterion IDed and independently checkable):
- **AC-1**: A fresh chat shows four starter cards (`Solve a past paper`, `Explain my notes`, `Quiz me`, `Plan my revision`). Tapping one fills the composer and focuses it without sending. The cards are gone once the conversation has a message.
- **AC-2**: While an answer is in flight, one collapsed line sits above the answer text from the moment send is pressed, naming the current step from the label set (`Searching the web for "coordinate geometry 2023"`, `Reading your notes`, `Opening "<title>"`, and so on), with a fallback label for any tool with no entry. No tool identifier and no raw JSON ever reaches the screen.
- **AC-3**: Tapping the activity line expands it into the ordered steps and the sources the answer used, counted from `source-url` and `source-document` parts only. A step that fails keeps its place with a plain sentence and a closed `Technical details` disclosure. The answer still streams.
- **AC-4**: While an answer streams, the send control is a stop control and is reachable. Stopping saves the text that already arrived, marks that answer stopped, and offers a retry that replaces that answer addressed by its assistant message id. A stop before the first token saves no assistant message at all.
- **AC-5**: The text area grows with its content up to a maximum height, then scrolls inside itself, and shows no browser resize handle. Enter sends with a fine pointer, Shift Enter inserts a newline, and Enter inserts a newline on a coarse pointer.
- **AC-6**: Each attachment shows its own upload progress while the composer stays usable. A failed file blocks send until retried or removed. An attachment opens a preview on tap (image lightbox with zoom, document sheet), never a new tab. Each attachment removes on its own and the count matches the list exactly, with overflow collapsing into a `+N` chip.
- **AC-7**: A paste that would take the message past 6000 characters is offered as a text attachment with a `Show in text field` reversal. If the provider rejects a text file part, the paste stays in the composer with a plain notice and its character count.
- **AC-8**: An unsent draft survives leaving and returning to the same conversation within the session, and is gone when the tab closes. Draft key is `ticlearn-chat-draft:<conversationId>` in sessionStorage.
- **AC-9**: Under the newest assistant message only, Tip offers two or three suggested questions as tappable chips, written in the student's own voice and anchored in what the answer just said. Tapping one sends it immediately. Older answers carry no chips, and the fresh chat starter cards are unchanged.
- **AC-10**: An answer renders as plain text with no border, no background and no corner radius, filling a centred reading column capped at 48rem. Only the student's own message is a bubble. The Tip and Study assistant label row above each answer is gone. Every corner still drawn uses the `--radius` token.
- **AC-11**: Each message carries its own actions. An answer offers Copy, Regenerate and Make a quiz from this. The student's message offers Copy and Edit. On a coarse pointer the actions are always visible; on a fine pointer they appear on hover or keyboard focus. Each is at least 44 by 44 pixels with an accessible name.
- **AC-12**: Edit loads the message text into the composer with an always visible line saying everything after it will be replaced. Sending updates that message and removes every message after it. Nothing branches and no version arrows are drawn.
- **AC-13**: When the daily allowance is spent, the composer is replaced by a plain line naming the reset time and a link to the plans, and the thread stays readable.
- **AC-14**: No spinner is a loading state anywhere on the chat page. The only spinner allowed is inside a button performing the student's own action. Awaiting first data shows a shape matched skeleton; refreshing content dims with a thin bar at the top; a process shows a bar with a real number; a long answer streams with a caret.
- **AC-15**: Chat files upload from the browser straight to Vercel Blob with a short lived token from `/api/chat/upload`. The route requires a session, allows only declared types and sizes (8 MB image, 16 MB PDF or DOCX, 4 MB text), issues a token scoped to `chat/<userId>/` that expires within the minute.

## Data model sketch

| Entity | Field | Type | Change |
|---|---|---|---|
| `ChatConversation` | `id` | `String` | PK, unchanged |
| `ChatConversation` | `userId` | `String` | N:1 to user, unchanged |
| `ChatConversation` | `title` | `String` | unchanged |
| `ChatConversation` | `noteId` | `String?` | optional note, unchanged |
| `ChatConversation` | `updatedAt`, `createdAt` | `DateTime` | unchanged |
| `ChatMessage` | `id` | `String` | PK, unchanged |
| `ChatMessage` | `conversationId` | `String` | FK to conversation, unchanged |
| `ChatMessage` | `userId` | `String` | unchanged |
| `ChatMessage` | `role` | `String` | user or assistant, unchanged |
| `ChatMessage` | `content` | `String` | unchanged |
| `ChatMessage` | `parts` | `Json` | file parts carry Blob URLs; `tool-suggestReplies` part carries chips |
| `ChatMessage` | `stoppedAt` | `DateTime?` | set when the student stops the stream |
| `ChatMessage` | `createdAt` | `DateTime` | unchanged |
| Client only | draft | `sessionStorage`, key `ticlearn-chat-draft:<conversationId>` | not persisted to the database |

No new table. No new enum. Attachments stay as file parts inside `parts`, so a stored attachment needs no join. The sidebar inside the chat layout reads the same conversation rows; no pinned flag or folder is added in this spec (information architecture stays with feature 46).

## State transitions

- **Answer**: `submitted` → `streaming` → `complete` | `stopped` | `failed`. `stopped` is the only state that needs storage, through `stoppedAt`.
- **Attachment**: `empty` → `uploading` → `uploaded` | `failed` → `sent`. A `failed` attachment blocks send until retried or removed.
- **Activity step**: `pending` → `running` → `done` | `failed`. Steps derived from part states, never stored separately.
- **Composer**: `ready` → `submitted` → `streaming` (stop available) → `ready`. Uploading never removes the composer from `ready`.
- **Message edit**: `idle` → `editing` → `replaced` → `idle`. Cancelling returns to `idle` with the draft it replaced.

## API surface

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/chat/upload` | POST | client upload request from `@vercel/blob/client` | short lived upload token scoped to `chat/<userId>/`, allowed types, max size, 60 second expiry | session required | 401, 413, 415 |
| `/api/chat/conversations/[id]` | GET | `cursor`, `limit` | conversation with `note { id, title }`, messages with `stoppedAt` | session and ownership | 401, 404 |
| `/api/chat/conversations/[id]` | DELETE | none | deletes conversation and its Blob files | session and ownership | 401, 404 |
| `/api/ai/chat` | POST | messages, `conversationId`, optional `editMessageId`, `retryMessageId` | stream, saved stopped answer, edit replaces message and removes later rows | session, plan limits, ownership | 400, 401, 403, 404 |
| `/api/usage` | GET | none | `chatDailyUsage.resetsAt`, credit costs | session | 401 |

No new endpoints. All are existing; this spec restyles the clients that consume them.

## Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Activity step label | human phrase per tool | static map in `lib/chat/activity-labels.ts`, keyed by tool name |
| Unmapped tool label | fallback phrase `Working` plus server log | fallback entry in the same map, logged once per unknown tool name |
| Activity step detail | echoed query or note title | tool part `input` the SDK sends |
| Failed step sentence | plain sentence + details body | part state `output-error` and its `errorText` |
| Step order | order shown | order of `message.parts` |
| `Thought for Ns` | duration | client clock, submit to last part, memory only |
| `Read N sources` | count | number of `source-url` and `source-document` parts |
| Source rows | title and link | the same source parts |
| Attachment count | number on screen | the one attachments list the strip draws from |
| File size before send | human size | the `File` object the student picked |
| Attachment preview | image or document | file part `url` |
| Action labels and icons | `Copy`, `Regenerate`, `Make a quiz from this`, `Edit` | one constant in `components/chat/constants.ts`, drawn with `lucide` icons |
| Quiz prefill | `Quiz me on this` | same constant, written into the composer, never sent |
| Edited message | replacement text | composer value at send, with `editMessageId` naming the row |
| Reading column width | 48rem cap | one class on `ConversationContent`, not repeated per message |
| Upload path | Blob key | `chat/<userId>/<random>` issued by `/api/chat/upload`, 60 second expiry |
| Note name in thread | title | `ChatConversation.note.title` through messages read |
| Note context | summary, key points, first 4000 chars | `Note.summary`, `Note.keyPoints`, `Note.extractedText` |
| Stopped marker | `Stopped` line | new `ChatMessage.stoppedAt` |
| Allowance reset | time in limit line | `chatDailyUsage.resetsAt` from `useUsage`, formatted with Africa/Douala formatter |
| Capability line | sentence | one constant in `components/chat/constants.ts` |
| Starter cards | four labels and prompts | one constant in `components/chat/constants.ts` |
| Suggested questions | chip text | `suggestReplies` tool output, validated and capped on server |
| Chip tap | message sent | chip's own text, verbatim, no client rewrite |
| Draft | unsent text | `sessionStorage` under the conversation key |

## Key invariants

- Every tool name maps to exactly one human label in one module. No component prints a tool identifier.
- Only the student's message carries a container. An answer with a border, background or radius is a bug; the reading column is defined once on the content wrapper.
- An edit removes every later message on the server before the stream starts, so a reload can never resurrect a replaced turn.
- A suggestion has a `tool-suggestReplies` part behind it or it does not exist. Nothing on the client invents, rewrites or reorders a chip; a tap sends stored text verbatim.
- Chips render on the newest answer only; `suggestReplies` is filtered out of activity steps.
- A tool name missing from the label map renders the fallback and logs once, so a new tool is never silent and never leaks its identifier.
- Source count and rows come from `source-url` and `source-document` parts only. A tool result is never counted as a source.
- Attachment count and strip read the same list. A second counter is a bug by construction.
- A duration is never stored and never invented for history.
- A stopped answer never renders as complete.
- The note excerpt never exceeds 4000 characters on the send path.
- Every stored file part renders from its `url`, whatever origin it carries. Availability is decided by load, not origin.

## Security model

- `/api/chat/upload` requires a session, keeps type and size ceilings (8 MB image, 16 MB PDF or DOCX, 4 MB text), namespaces path with user id, and is rate limited.
- Blob files are public with unguessable URLs, same exposure as today's UploadThing links. Accepted risk; private access upgrade in Follow-up.
- Note context is read only when the conversation belongs to the signed in student and the note belongs to the same student.
- The delete route removes only files named inside that student's own conversation.
- An edit names one message id. The route updates it and removes later rows only when that message belongs to the signed in student's conversation, and answers 404 otherwise.
- A suggestion is model output from web reading, treated as untrusted: length capped, markdown and links stripped, duplicates removed, never more than three.
- No new personal data is stored. Chat already holds the student's questions and files.

## Configuration required

- `BLOB_READ_WRITE_TOKEN` (or `VERCEL_OIDC_TOKEN` with `BLOB_STORE_ID`): Blob store credential. Documented in `.env.example`, never in client code.
- `next.config.ts`: Blob host added to `img-src`, `connect-src` and `frame-src` in CSP. Already done by 0020; this spec keeps it.

## Critical test scenarios

- Happy path: send a question with a note attached, watch the activity line run and settle, expand it and read steps and sources. Verifies AC-2, AC-3.
- Happy path: read a long answer on phone and wide window, confirm no container, column stops at 48rem, only the question is a bubble, name label gone. Verifies AC-10.
- Happy path: copy an answer, regenerate it, tap Make a quiz from this, confirm composer fills without sending. Verifies AC-11.
- Happy path: edit a question three turns back, confirm replace warning visible before send, confirm later turns gone on reload. Verifies AC-12.
- Happy path: fresh chat shows four starter cards, tap one, confirm composer fills without sending; send a message, confirm cards gone. Verifies AC-1, AC-8.
- Happy path: attach a photo, watch upload progress while typing, preview it, remove one of two, check count. Verifies AC-6, AC-15.
- Failure case: stop mid answer, reload, confirm partial answer marked stopped and retry replaces it. Verifies AC-4.
- Failure case: tool fails and file upload fails, confirm plain lines, closed details, blocked send. Verifies AC-3, AC-6.
- Failure case: provider rejects a text file part, confirm paste stays with notice and count. Verifies AC-7.
- Permission case: student with no note asks for research and quiz, confirm both work and quiz stores null note. Verifies de-gating.
- Permission case: unauthenticated upload token request, confirm 401 and no file lands in store. Verifies AC-15.
- Permission case: edit naming a message in another student's conversation, confirm 404 and no rows removed. Verifies AC-12.
- Accessibility: keyboard only through message actions, composer, starter cards, attachment strip, with screen reader. Verifies AC-11, AC-14.
- Loading states: no `Loader2` or `Loader` outside `components/ui/` and `components/ai-elements/` unless inside a Button. Verifies AC-14.

## Build plan

Tracer Bullet. One slice restyles the chat page and every component it touches, ships end to end, then the next slice thickens.

1. Message shell restyle: strip assistant card in `components/ai-elements/message.tsx` (no border, background, radius, `w-full`), cap `ConversationContent` at 48rem centred, keep primary bubble on student message with `--radius` corner, delete Tip and Study assistant label row, turn thinking and failure bubbles into plain lines inside column. Copy actions on both roles. Satisfies AC-10, AC-11.
2. Activity block restyle: `lib/chat/activity-labels.ts` label map and `components/chat/activity-block.tsx` collapsed summary, expanded steps, duration, failed step with closed details, one polite live region, `aria-hidden` timer. Replace card/reasoning/sources blocks in `chat-message-list.tsx` with activity line above answer text; filter to tool parts and `source-*` parts only. Satisfies AC-2, AC-3, AC-14.
3. Composer restyle: auto grow to max then internal scroll, `resize-none`, Enter/Shift Enter per pointer type, submit control becomes stop while streaming. Satisfies AC-4, AC-5.
4. Blob upload path: keep `/api/chat/upload` with session, type/size checks, 60 second expiry scoped to `chat/<userId>/`; client `upload()` with per-file progress, failed file blocks send. Satisfies AC-15.
5. Attachment strip and previews: per-item remove, `+N` overflow chip, image lightbox with zoom, document preview sheet framing Blob URL, plain notice on unresolved URL. Satisfies AC-6.
6. Long paste conversion at 6000 chars with `Show in text field` reversal, plain notice fallback for rejected text part. Satisfies AC-7.
7. Draft persistence in `sessionStorage` per conversation, reusing pending-message pattern. Satisfies AC-8.
8. Starter cards and suggested questions: four cards on fresh chat, `suggestReplies` tool with server validation (2-3, 60 chars, no markdown, deduped), chips under newest answer only, send on tap. Satisfies AC-1, AC-9.
9. Edit in place: question editor in question's row (Save/Cancel/Escape/Return), composer loads text with replace warning, sending updates message and removes later rows. Satisfies AC-12.
10. Allowance notice: spent state replaces composer with reset time line and plan link, thread stays readable. Satisfies AC-13.
11. Sidebar restyle within chat layout: clean modern look for `chat-sidebar.tsx` and `chat-header.tsx`, matching the reading column theming, no change to information architecture (feature 46 owns that). No spinner as loading state anywhere on the page. Satisfies AC-14.

## Consequences

**Positive**:
- A student sees a plain sentence instead of a developer console, and can stop a runaway answer on a metered connection.
- The composer stops freezing while a photo uploads and keeps drafts across navigation.
- Chat files no longer pass through a serverless function, so a 16 MB PDF uploads at connection speed.
- The tutor works for a student who has uploaded nothing, which is most students on day one.
- Suggested questions give a student who does not know what to ask next two or three concrete follow ups.

**Negative / tradeoffs**:
- A stop control that sends on tap means a mistap spends one metered daily message with no undo. The send arrow and short text are the only protection.
- Chips cost one extra tool step at the end of an answer; a model that declines the tool produces none.
- Public Blob URLs are readable by anyone holding the link. That is today's exposure, now written down.
- Editing a question is destructive: turns after it are deleted, not branched, so editing the wrong message loses what followed. The warning is always visible.
- The 6000 character paste conversion depends on the provider accepting a text file part, which the build must prove early.

**Neutral**:
- No new table, no new enum, no new endpoint. All behaviour surface already exists; this is a restyle.
- The sidebar information architecture is untouched; feature 46 owns it.
- The composer's Enter behaviour is unchanged and now covered by tests.

## Follow-up

- [ ] Prove the Blob path against a real store: add `BLOB_READ_WRITE_TOKEN`, upload one 16 MB PDF, delete the conversation and confirm the file is gone.
- [ ] Pull origin/main before building. This session is 5 commits behind and a teammate may have touched chat files.
- [ ] Prove the text file part early; if the provider rejects it, paste falls back to the notice path and AC-7 is verified against that.
- [ ] Private Blob access is the upgrade path for student files. Revisit when the storage slice lands.
- [ ] Retire UploadThing once its links stop mattering; delete `lib/uploadthing.ts`, the `chatUploader` router entry and `utapi` cleanup together.
- [ ] `MAX_PART_CHARS` (8000) in `app/api/ai/chat/route.ts` vs the 6000 conversion threshold — check before changing either number.
- [ ] `lib/chat/title.ts` provisional title is written before the stream starts; the Inngest title job refines it later. Confirm the delayed refetch picks it up.

## Migration plan

Strategy: single deploy for the interface; no data migration needed (no schema change). All ACs are client and route behaviour changes.

Phases:
1. Ship message shell and activity block restyle with existing behaviour intact.
2. Ship composer restyle, attachment previews, starter cards and suggested questions.
3. Ship edit in place, allowance notice and sidebar restyle within the chat layout.

Rollback: reverting is a code revert with no data effect. No data was moved.

Risks: a wrong CSP blocks every Blob image and PDF preview; deleting a conversation during a partial upload can orphan one file (accepted and logged); a Blob outage blocks new attachments while text chat keeps working.
