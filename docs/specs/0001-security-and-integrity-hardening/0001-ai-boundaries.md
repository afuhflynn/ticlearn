# 0001 c. AI tool boundaries and upload safety

Child of [0001](../index.md). Prompt injection blast radius and the server side request forgery hole. Governed by the umbrella, no lifecycle status here.

## Summary

Students upload arbitrary documents and the app hands their text to a model that can create quizzes, search the web and read the database. The only stated defence is a block of instructions in the system prompt, which is a request to a model and not a control. This child moves the decision out of the prompt and into code: one policy wrapper every tool passes through, no raw note text returned to the model, no model owned publishing flag, scrubbed web search queries, and no client supplied URL ever fetched by the server.

## Requirements

- **AC-10**: A note create request's `fileUrl` value is ignored and the stored URL is derived server side from the upload key, and the fetcher refuses private, loopback and link local addresses and does not follow redirects. The same rule applies to the admin question ingest route, which also takes a client URL that a worker fetches.
- **AC-11**: Every chat tool in both chat tool sets (11 tools in the general set) is wrapped by `wrapTool`, no tool returns a raw `extractedText` field, and no tool queries Prisma without a user scope, either directly in the where clause or inside an OR branch, with the public quiz branch as the only allowlisted exception. A code shape test fails otherwise.
- **AC-12**: `webSearch` refuses (returns a plain refusal, no search performed) when the query contains an email address, a phone like digit run, a long digit run, or instruction shaped text, and truncates each returned result to about 2000 characters.
- **AC-13**: `createQuiz` no longer accepts `isPublic` from the model, and creates the quiz with `isPublic: false`.
- **AC-14**: `POST /api/ai/chat` returns 400 when `messages` has more than 50 entries or any text part is longer than 8000 characters, and no model call is made.

## Decision

**Chosen**: close the leaks in code rather than buy a detector. A hand rolled `wrapTool` policy hook owns the boundary, the cross user knowledge tool is deleted, raw extracted text never leaves a tool, publishing is not a model decision, web search queries carrying private data are refused rather than redacted, the client's note URL is ignored in favour of a server derived one, and chat input is capped at the route.

## Feature design

**Data model**: none. The stored note URL becomes server derived, which is a contract change, not a schema change.

**Policy set** (`lib/ai/tool-policy.ts`):

| Policy | Applied to | What it enforces |
|---|---|---|
| `scopedRead` | every tool that queries Prisma | the query carries a user scope: `userId` directly in the where clause, or inside an `OR` branch of the form `{ userId }` or `{ isPublic: true, status: "READY" }`. `getUserQuizzes` and `getQuizContext` use the OR form today; that form is the one allowlisted exception, and a tool that carries neither is refused |
| `noRawText` | note and quiz context tools | returns `summary`, `topics`, `keyPoints` and related quiz metadata; never `extractedText` |
| `scrubQuery` | `webSearch` | refuses the call on personal data or instruction shaped text, caps length, and truncates each result |
| `noModelOwnedVisibility` | `createQuiz` | `isPublic` is not in the model's schema; the handler writes `false` |
| `boundedWrite` | `createQuiz` | question count capped by the plan limit already computed in the handler |

Both chat tool sets are in scope: the general chat set built by `createChatTools` (11 tools) and the Paper 3 exam assistant's tools used by `/api/paper3/chat`. The Paper 3 set is smaller but reads the same notes and attempts, so it gets the same treatment.

**API surface**:

| Endpoint or tool | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/ai/chat` | POST | `messages` (at most 50, each text part at most 8000 chars), `conversationId` | stream, unchanged | session, `aiChat` bucket | 400 on oversized input |
| `/api/notes` | POST | `title`, `subject`, `fileName`, `fileType`, `uploadthingKey`; `fileUrl` accepted in the payload and **ignored**, replaced by the derived value | created note with the derived `fileUrl` | session, plan note limit | 400 if `uploadthingKey` missing or the key cannot be resolved |
| `/api/admin/questions/ingest` | POST | `componentId`, `examSourceId`, `fileName`, upload key; client `fileUrl` ignored and replaced by the derived value | ingest job id | session plus admin role | 400 as above |
| `webSearch` tool | internal | `query` (max 200 chars), `searchDepth` | results with content truncated to about 2000 chars, wrapped as labelled untrusted data | captured `userId` | tool returns a plain refusal, does not search |
| `createQuiz` tool | internal | model supplied title, questions, optional note id | quiz with `isPublic: false` | captured `userId` plus note ownership re-check | throws when the note is not the caller's |
| `searchKnowledge` tool | removed | n/a | n/a | n/a | absent from the tool set |

**Why the payload keeps a `fileUrl` it ignores**: `Note.fileUrl` is not nullable and three live readers depend on it being a stored, viewer usable URL: the notes detail page uses it for a download link and a PDF viewer, `app/api/quizzes/[id]/route.ts` reads it, and the note context tool returns it. The URL derivation helper in `lib/file.ts` is a stub that returns a key unchanged, and UploadThing's signed URLs are asynchronous and expiring, which would break the viewer. So the field stays in the request for client compatibility, its value is discarded, and the server derives the public URL from the upload key. The schema carries a comment saying the value is ignored, so nobody later believes it is used. Deriving rather than filtering is still what closes the hole: the server decides the target, and the range check plus no redirects is the second layer under that.

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| note file location | where the worker fetches bytes | derived server side from `uploadthingKey`, ignoring the client's `fileUrl`; the existing key to URL helper in `lib/file.ts` is completed as part of this work |
| fetch safety | whether a target is fetchable | hostname and resolved address, checked against private, loopback and link local ranges |
| web search refusal | why the search was refused | the query string itself, checked by `scrubQuery` |
| quiz visibility | whether a quiz is public | hard coded `false` in the handler; publishing becomes a separate user action, out of this slice |
| chat input bounds | whether input is acceptable | `messages.length` and per part text length, both measured in the route |

**Key invariants**:
- Retrieved content never reaches the step where the model chooses its next tool. No tool returns raw note text, so a poisoned note cannot steer a tool call.
- No tool argument can name another user's data. The user id comes from the session when the tool factory is built, never from an argument.
- No client supplied URL is fetched by the server. The only fetches are derived from an upload key and still range checked.
- A write never becomes public without a user decision.

**Critical test scenarios**:
- Injection: a note whose text contains instructions to search the web and publish a quiz results in no public quiz and no web search carrying any string from the note, verifies **AC-11**, **AC-12**, **AC-13**.
- Isolation: a chat session cannot read a note, quiz or attempt belonging to another account, verifies **AC-11**.
- SSRF: a note create request carrying `fileUrl: "http://169.254.169.254/..."` has that value ignored, the stored URL points at an upload host, and nothing fetches the supplied address, verifies **AC-10**. The same request to the admin ingest route behaves identically.
- Bounds: a chat request with 51 messages returns 400 and makes no model call, verifies **AC-14**.

## Build plan

1. Build `lib/ai/tool-policy.ts` with `wrapTool` and the policy set. Satisfies **AC-11**.
2. Delete the `searchKnowledge` tool and unregister both knowledge harvest jobs (the readers are recorded in the route and payment child; this is where the tool goes). Satisfies **AC-5**, **AC-11**.
3. Wrap all 11 tools in the general chat set and every tool in the Paper 3 exam set, applying `scopedRead` and `noRawText`, and add the code shape test for user scope and raw text returns. Satisfies **AC-11**.
4. Apply `scrubQuery` and result truncation to `webSearch`, and wrap each result as labelled untrusted data. Satisfies **AC-12**.
5. Remove `isPublic` from the `createQuiz` input schema, write `false` in the handler, and cap question count by plan. Satisfies **AC-13**.
6. Cap `messages` count and part length in the chat route before any conversion or model call. Satisfies **AC-14**.
7. Ignore the client `fileUrl` on `/api/notes` and `/api/admin/questions/ingest`, complete the key to URL helper, derive the stored URL, and add private range rejection plus no redirects in the fetch helper. Satisfies **AC-10**.

## Consequences

**Positive**: a student who uploads a hostile document cannot reach another student's notes, cannot publish to everyone, and cannot carry private text into a third party search. The server stops being a fetch proxy for arbitrary URLs, on both the student and the admin path. New tools fail the test if they skip the wrapper.

**Negative / tradeoffs**: the agent loses verbatim search inside the student's own notes, because tools now return summaries, topics and key points instead of raw text. Study answers may get slightly less specific on long documents, and that is a real product cost paid for a real security property. Students who ask the web search about their own email or exam number get a refusal instead of results. The `fileUrl` field survives in the payload as a value the server ignores, which is a small piece of debt that will confuse a future reader unless the schema comment survives with it.

**Neutral**: no new packages. The hand rolled wrapper is roughly 30 lines and is ours to maintain; if Arcjet ships a v6 adapter it becomes a candidate to adopt. This child deliberately stops short of the approval tap on `createQuiz` and of untrusted content envelopes, which the scope defers.

## Rationale

The deciding force is that a prompt is not a control. The research is right that the current posture is theatrical, and right that the fix is not a better prompt, because the model's compliance decision is the thing an attacker is trying to subvert. The cheapest correct expression of that here is the ownership re-query already in `createQuiz`, extended to every argument, made a property of the tool set by `wrapTool` so a careful developer is not the control. The scope test is written structurally rather than as a substring search, because half the read tools scope through an `OR` branch and a substring rule would either fail them or pass anything.

Removing raw text returns is the highest value single change here and the one with a real product cost. It works because the summary, topics and key points are already model derived and are the actual study value, so the agent keeps most of its usefulness while the injection carrier is gone. The alternative, wrapping raw text in an untrusted envelope, keeps verbatim search but only reduces the attack success rate rather than removing the capability to steer a tool call, and it costs tokens on every call. Given the audience includes a cross user data leak in the same tool set, removing the carrier beats labelling it.

The note URL decision changed during review, and the reason is a product constraint the first answer missed. Three live readers need a stored URL that a browser can open in a viewer, which rules out expiring signed URLs, and the derivation helper is currently a stub, which rules out "we already derive it". Deriving a public URL from the upload key satisfies both and still means the server decides the target, so the SSRF hole closes on both the student and the admin ingest path. The range check stays as the second layer under that decision rather than as the only layer.

Refusing rather than redacting the web search query is the second call with a user visible cost. Redaction still sends a derived query to a third party and the derivation leaks structure, so refusal is the only version that actually stops the exfiltration path. A student asking about their own exam number is the false positive, and it is the one worth having.