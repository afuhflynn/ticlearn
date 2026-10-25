# Rationale for 0020

## Context

The chat is the product's second surface after notes, and it is the one students use daily. It currently reads as a developer tool. A question that calls a tool renders a bordered card with a wrench icon, a status badge, a `Parameters` heading and the raw JSON arguments, then a `Result` heading and the raw payload. The model's reasoning renders as a shimmer that never stops, because the duration is hardcoded to zero. A separate sources block sits between the reasoning and the answer. Nothing on that screen was designed for a student.

The composer has its own defects, all visible on a phone. The text area has no auto grow and keeps the browser resize handle. The send button is disabled while streaming, so the stop control that the design system already draws is unreachable, which on a metered connection means a runaway answer cannot be stopped. The whole composer is disabled while a file uploads, and every attachment card shows the same single progress number. An attachment opens a link in a new tab instead of a preview. The draft dies when the student navigates away, which is the most expensive thing to retype on a shared phone.

The suggestion row above the composer is the last piece of the old chat. It is a fixed list that sends on tap, so it ignores the conversation entirely, and on a phone it is a horizontal scroller with the last item hidden behind a swipe nobody performs. The research on follow-up chips names the same failure in every product that ships them: a chip that could have been written before the answer was read is noise, and more than five recreate the blank page they were meant to fix.

The tutor is also gated on notes in a way the product no longer wants. The system prompt tells Tip to say plainly when no note is attached and offer to ground on one. The quiz tool refuses to build practice without a note and asks which note to use. The landing copy leads with quoting the student's own notes. A student who wants to learn a new topic, research it, or get practice questions has to upload something first, which is the opposite of what a study assistant should require.

The forces that shape the answer: a phone first audience on roughly 1.63 USD per GB, so every repaint and every unoptimised photo is money; a loading rule in this repo that bans a spinner as a loading state and asks for shape matched skeletons and honest progress; a design system that owns the tokens and forbids new styling systems; a content security policy that lists its allowed image origins by name; and a research document, `docs/research/chat-experience.md`, that already audited the code and measured the same patterns across ChatGPT, Claude, Gemini and Perplexity.

> ⚠️ Premise note: the storage cutover from UploadThing to Vercel Blob is a second decision inside an interface slice. It brings a new credential, a content security policy change, a new token route and a delete path that can orphan files. The interface can ship without it, and the scope already carries a storage move as feature 22. The engineer chose to take it here, so it is scoped as one build task with its own rollback rather than spread through the slice. If it slips, the thread and composer slices still ship.
>
> ⚠️ Premise note: the automatic conversion of a long paste into a text attachment depends on the model provider accepting a text file part, which nothing in this repo has proven. The build must test that early. The spec names the fallback so the feature cannot silently become a truncation.

## Options considered

### Activity disclosure

**Option 1: one collapsed summary line that expands** (chosen). The line reads `Thought for 6s · Read 5 sources` and opens into the ordered steps and the sources. One line of chrome above every answer.

**Pros**: matches what all four reference products do; the answer stays above the fold on a small screen; the disclosure costs one tap only when the student wants it.

**Cons**: a student who never taps learns less about what the tutor can do; the collapsed line is a summary, so it can be slightly imprecise about a step that failed.

**Option 2: a collapsed list of step lines.** Every step is its own line, grouped and collapsed.

**Pros**: honest at a glance; no summarising to get wrong.

**Cons**: tall above every answer, which is Perplexity's stack and the pattern the research warns against for a metered phone; more text to read before the answer.

**Option 3: one line that swaps to the current step.** Only the step running right now is visible, and earlier steps disappear.

**Pros**: the quietest possible surface.

**Cons**: a step that vanishes reads as data loss when a search fails; there is no way to see what the answer was built from.

### Composer and thread approach

**Option 1: fix in place on the existing AI Elements** (chosen). Keep `components/ai-elements/prompt-input.tsx` and the chat components, fix the text area, wire the stop control, add the activity block, and add the attachment strip.

**Pros**: the primitives, the tokens and the accessibility work already exist; the diff stays inside the files the team knows; no new dependency for the chat surface.

**Cons**: `prompt-input.tsx` is 1414 lines and carries unused exports, so the team keeps paying for a file it only half uses.

**Option 2: replace the chat stack with a purpose built one.** Write a new composer and message list from scratch, dropping AI Elements for the chat surface.

**Pros**: exactly the behaviour we want, no unused code.

**Cons**: a big rewrite of a surface that works, with the accessibility and focus handling rebuilt by hand; it would compete with the existing design system rather than use it.

**Option 3: keep the raw trace and only relabel it.** Rename the tools and keep the JSON behind a disclosure.

**Pros**: smallest possible change.

**Cons**: it leaves the JSON in the student's path and keeps the developer console feel that is the actual complaint.

### Chat file storage

**Option 1: Vercel Blob, uploaded from the browser with a token route** (chosen). The browser posts straight to Blob after our route issues a short lived token.

**Pros**: no file passes through a serverless function, so a 16 MB PDF does not hit a body ceiling and does not cost double the bytes; the store is on the same platform as the deploy; `del()` gives a clean delete path.

**Cons**: a new credential and a content security policy change; public URLs are readable by anyone with the link; it is a second storage system while UploadThing still holds the old files.

**Option 2: keep UploadThing.** Leave the upload path alone and only fix the composer.

**Pros**: no new dependency, no policy change, no migration.

**Cons**: the file still travels through a hosted router, the delete path stays tied to `utapi`, and the storage move stays queued.

**Option 3: Blob through a server proxy.** Our route receives the file and forwards it.

**Pros**: one path to reason about, and the server can inspect every byte.

**Cons**: a serverless body limit and a function invocation per upload, and the bytes cross the network twice on a weak connection.

### Note gating

**Option 1: interface, prompt and tools together** (chosen). Change the copy, and also the two prompt lines and the quiz tool.

**Pros**: the interface cannot promise something the prompt refuses; a student with an empty library gets the same tutor.

**Cons**: the slice now touches the prompt registry and a tool schema, so it is no longer pure interface work.

**Option 2: interface copy only.**

**Pros**: smallest change.

**Cons**: the first message reveals the gate, which is worse than never making the promise.

**Option 3: include the Firecrawl swap too.**

**Pros**: makes the research promise fully real in one step.

**Cons**: mixes the search provider decision, its fallback and its measurement into a UI spec, and duplicates scope feature 19.

### Starters

**Option 1: four cards that replace the grid and the chips** (chosen). A 2 by 2 grid on a fresh chat only, each card filling the composer.

**Pros**: one set of prompts instead of eight; two cards teach attaching, which is the habit the product needs; the cards disappear once the thread starts.

**Cons**: fewer visible entry points than today, and the quick action prompts that exist today are lost unless they move into the cards.

**Option 2: keep the grid and the chips and fix the tap.** Nothing is lost, and the landing keeps eight competing prompts.

**Option 3: make one card name the student's programme and faculty.** More personal, and it depends on profile fields that can be empty.

### Suggested questions

**Option 1: one `suggestReplies` tool call in the same turn** (chosen). The model returns two or three questions at the end of a substantive answer.

**Pros**: rides the turn that is already open, so the cost is one step and a few tokens rather than a whole extra model call per answer; the questions can see the tool results the answer was built from; nothing new is stored; the model can stay silent when it has nothing useful.

**Cons**: the model decides when to offer them, so a one line reply carries none, and a model that forgets the tool produces no chips at all.

**Option 2: a separate route after the answer finishes.** The client asks a small model for three questions.

**Pros**: always fires, easy to test in isolation, and the request can be skipped when the allowance is low.

**Cons**: a whole extra model call per answer on a product that meters messages, plus a second round trip and a second prompt to maintain.

**Option 3: keep the static row and restyle it.**

**Pros**: nothing to build.

**Cons**: it stays generic, it keeps sending on tap without context, and it is the thing the research says students ignore.

### The shell

The sidebar, the header and the two competing shells are a real problem, and they are not this spec. They touch every authed page, and the fix is an information architecture decision rather than a styling pass: one sidebar, one header, one toggle, and the conversation list inside the main sidebar. It is enrolled as scope feature 46 so a shell rewrite cannot hold the chat hostage and the chat cannot hold the shell hostage.

## Rationale

The activity line is the decision this feature exists for. Every reference product collapses tool and reasoning activity into one line above the answer, and none of them ships raw JSON. The research measured twelve systems and found that the ones which describe the operation rather than saying "thinking" are the ones users trust. Collapsing by default also respects the connection: one static line that changes text costs a fraction of a shimmer that repaints on a loop.

Fixing in place is the boring and correct call. The AI Elements layer already carries the primitives, the focus handling and the token usage the design system demands, and the defects are specific and known: a text area without auto grow, a submit control defeated by one `disabled` expression, an attachment rendered as an anchor. A rewrite would rebuild all of that to arrive at the same screen.

Blob client upload wins on the constraint that actually binds here: bytes over a weak Cameroonian mobile connection. A server proxy doubles the transfer and adds a body ceiling that a 16 MB PDF will hit. The cost is a credential and a policy line, both of which are one line each and both of which the build task names.

De-gating the tutor is not a nice extra. The product's own positioning is a study assistant, and the prompt currently answers a research question by asking for a note. The interface and the prompt have to change together or the promise breaks on the first message. The Firecrawl swap is a different decision with its own fallback and measurement, and it already has a scope row, so it stays there.

The starters and the capability line are the same idea in two places: tell the student what the tutor can do, and give them a first move that does not require an upload. The four cards lead with attaching because that is the habit the audience needs, and one of them is a plain "Quiz me" so a student with nothing uploaded has somewhere to start.

The follow-up chips are the same idea applied after the first turn. The research is unusually consistent: three to five contextual chips under an answer, anchored in what the answer just said, with the generic ones named as the failure mode. A tool call wins over a second route because this audience pays per message, and a step inside the turn that is already open is the cheapest way to get questions that can see what the answer was built from. It also means the model can stay quiet, which is the honest behaviour for a one line reply.

The chips send on tap. That is Perplexity's behaviour and it is against the general guidance to fill the composer so the student can edit first. The engineer chose speed, on the reasoning that a student who taps a question has already decided to ask it, and a confirm step is friction on a connection that is already slow. The cost is real and is written into the Consequences: a mistap spends one of a metered daily allowance and there is no undo. That is why the chip carries a send arrow rather than looking like a text field, and why the output is capped and validated before it is ever drawn.
