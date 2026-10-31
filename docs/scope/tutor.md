# Tutor

Slice 2, the chat. The interface is already close to what we want and is being underused: only nine of thirty two installed AI Elements are imported, and the thinking and tool blocks are wired but rendering badly. This slice fixes the experience and puts web search behind a control the student owns.

NOTE: We actually are suggesting to use  vercel blob db for handling image uploads in the chat to make things faster. and I don't know if this has been documented along the way
(basis: research/chat-experience.md · research/web-search-tooling.md)

## Slice 2: The tutor

### 18. Chat interface rebuild · in-progress · GA
Students currently see raw tool call traces, which reads as broken. Every serious product collapses that activity into a labelled line above the answer that expands on tap. The composer has no auto grow, the send button is disabled mid stream so the stop control is unreachable, an attachment opens a link instead of a preview, the attachment count is wrong, and there is a resize handle nobody asked for. ChatGPT is the reference for this.
**Done when:** an in progress answer shows one collapsed activity line above it with human phrasing such as "Searching the web" and "Read 5 sources", tapping it expands the detail, the composer grows to a maximum height then scrolls, Enter sends and Shift Enter newlines, the stop control is reachable while streaming, an attachment previews on tap and removes individually with an accurate count, and a new chat shows three or four tappable suggestions that fill the composer rather than send. Spec 0020 also moves chat uploads to Vercel Blob and removes the note gate, so Tip researches, teaches and builds practice with or without a note.
- [x] Design it (spec): `/solution-architect chat interface rebuild` · spec [0020](../specs/0020-chat-interface-rebuild/index.md)
- [x] Build it: `/feature-build chat interface rebuild`
  - [x] The activity line through every layer, one label map with a fallback, steps, sources and a failed step (covers AC-1, AC-2, AC-3, AC-4, AC-18)
  - [x] Composer mechanics and stopped answers kept and marked, retry replacing by message id (covers AC-5, AC-6)
  - [x] Blob client upload with its token route, per file progress, attachment previews and the delete path (covers AC-7, AC-9, AC-15, AC-19). The live 16 MB proof waits on `BLOB_READ_WRITE_TOKEN`, which is not in `.env` yet
  - [x] Long paste as a text attachment, the per conversation draft and the note context on the send path (covers AC-10, AC-11, AC-12)
  - [x] De-gate the tutor in the prompt and the quiz tool, the capability line, the four starters, the suggested questions under the newest answer, and the allowance and connection states (covers AC-8, AC-13, AC-14, AC-16, AC-17, AC-23, AC-24)
- [ ] Verify it: `/verify-release chat interface rebuild`
- [x] Test it: `/test-engineer chat interface rebuild`
- [x] Review it (fresh model): `/peer-review chat interface rebuild`
- [x] Document it: `/tech-writer chat interface rebuild`

(basis: research/chat-experience.md §1 and §2 · six of twelve surveyed systems use action specific labels and none ship raw JSON, so the vocabulary is copied rather than invented; also, three separate public complaint threads show Enter sending instead of newlining on mobile is a real problem)

### 19. Web search tooling · in-progress · GA
The agent has one search provider today. Make Firecrawl the primary and Tavily the fallback, behind tools the model sees as plain capability, so the model never has to reason about which provider is up. Research measured the sharp edges: Firecrawl's default highlights setting returns pages instead of snippets, it has no Cameroon proxy, Tavily's raw content is uncapped and will flood the context, and Firecrawl is up to ten times cheaper per call.
**Done when:** one normalised output shape across the tools, Firecrawl tried first for a search, Tavily used only when Firecrawl errors or returns nothing usable, an empty result gets one more Firecrawl attempt in a different mode before falling back, a pasted link is read by its own tool through Firecrawl alone, results are deduplicated and capped before reaching the model, a repeat question costs nothing, a fresh useful search costs the configured credit, and we can measure which provider actually served each answer.
- [x] Design it (spec): `/solution-architect web search tooling` · spec [0022](../specs/0022-web-search-tooling/index.md)
- [x] Build it: `/feature-build web search tooling`
  - [x] Provider module, the thin fetch clients, the Firecrawl search pass, normalisation, dedupe and the caps (covers AC-1, AC-2, AC-6, AC-7, AC-8) · code in `lib/web-search/`, `lib/ai/tools.ts`, `prompts/tools/web_search.md`
  - [x] The fallback walk, the second Firecrawl pass, the Tavily client and the honest empty answer (covers AC-3, AC-4, AC-5, AC-9) · code in `lib/web-search/index.ts`, `lib/web-search/tavily.ts`, `lib/web-search/normalize.ts`
  - [x] Events, the shared cache, the 90 day sweep, the credit debit and the platform setting (covers AC-11, AC-12, AC-13, AC-14, AC-15) · code in `lib/web-search/index.ts`, `lib/web-search/query.ts`, `lib/inngest/cache-cleanup-functions.ts`, `lib/platform-settings-direct.ts`, `app/api/admin/platform-settings/route.ts`, `app/(admin)/admin/platform-settings/page.tsx`, `prisma/migrations/20261026142424_add_web_search_tooling/`
  - [x] `readPage` with its guard, prompt file and label, plus the per request cap (covers AC-10, AC-16, AC-19) · code in `lib/web-search/index.ts`, `lib/web-search/types.ts`, `lib/ai/tools.ts`, `lib/ai/tool-policy.ts`, `prompts/tools/read_page.md`, `lib/chat/activity-labels.ts`
  - [x] Config gate, remove the old Tavily block and its dependency, prompt cleanup (covers AC-17, AC-18) · code in `lib/web-search/firecrawl.ts`, `lib/ai/tools.ts`, `prompts/chat/chat_system.md`, `package.json`, `.env.example`
- [ ] Verify it: `/verify-release web search tooling`
- [ ] Test it: `/test-engineer web search tooling`
- [ ] Review it (fresh model): `/peer-review web search tooling`
- [ ] Document it: `/tech-writer web search tooling`

(basis: research/web-search-tooling.md §4 and §5 · fall back on not useful rather than only on errors, because an empty result is a mode problem while an error is a provider problem)

### 20. Tool controls and course skills · needs a decision
Students need to see and steer what the agent can do. Research found ChatGPT's three state sources picker, Auto, Search, Off, with Auto as the default, is the only documented pattern that gives the student a switch while leaving the decision to the system. On top of that, a student should be able to tell the agent about their course and their faculty once, and have that shape every answer.
**Done when:** the composer carries a sources control with Auto, Search and Off, Auto is the default, the chosen state applies to the next message, a chosen course and faculty reach the system prompt without the student retyping them, and the student can correct or clear them in one place.
- [ ] Design it (spec): `/solution-architect tool controls and course skills`

(basis: research/chat-experience.md §4 and §14 · we take the three state picker from ChatGPT and skip the skills marketplace vocabulary, which teardowns show confuses casual users, in favour of one visible correctable line)

### 47. Chat interface redesign · in-progress
The chat surface is restyled to a clean modern look inspired by the reference screenshots while keeping TiCLearn's own theming. The thread becomes a centred reading column with plain answers and only the student's message as a bubble. The composer grows, stops, previews files and shows per-file upload progress. Four starter cards greet a fresh chat, and two or three suggested questions appear under the newest answer. A question can be edited in place. No spinner is a loading state anywhere on the page. Attachments still upload straight to Vercel Blob through a short lived token route, and Tip still works with or without an uploaded note. This is a fresh spec (0024) separate from 0020, which described the behaviour surface already built. Lands as one Tracer Bullet slice through the chat page and its components.
**Done when:** a fresh chat shows four starter cards that fill the composer; answers render as plain text in a centred column capped at 48rem with only the student's message as a bubble; the activity line shows human step labels and expands on tap; the composer grows, stops and shows per-file upload progress; attachments preview on tap and remove individually; a question edits in place and removes later turns; the daily allowance spent state shows a reset time line; no spinner appears as a loading state anywhere on the chat page.
- [x] Design it (spec): `/solution-architect chat interface redesign` · spec [0024](../specs/0024-chat-interface-redesign.md)
- [x] Build it: `/feature-build chat interface redesign` · code in components/chat/
   - [x] Message shell, activity line and composer restyle (AC-2, AC-3, AC-4, AC-5, AC-10, AC-11, AC-14)
   - [x] Blob upload path, attachment previews and per-file progress (AC-6, AC-15)
   - [x] Long paste conversion, draft persistence and the allowance notice (AC-7, AC-8, AC-13)
   - [x] Starter cards, suggested questions and in-place edit (AC-1, AC-9, AC-12)
- [ ] Verify it: `/verify-release chat interface redesign`
- [ ] Test it: `/test-engineer chat interface redesign`

(basis: spec 0024 · restyle only, no data model or endpoint change; behaviour surface carried over from spec 0020)

### 56. Quiz practice inside chat · in-progress

Tip runs the whole quiz inside the conversation instead of sending the student away: it asks setup questions (topic, count) with tappable options, renders one question at a time with selectable options or typed answers, marks each answer as it lands, updates attempts plus retakes, and gives full correction at the end. When a quiz needs the full page (long diagrams, careful review), Tip says so and links the separate UI instead. Retrieval first: the student answers in their own words before Tip explains, so practice proves learning instead of handing over answers. This is not the dropped standalone exam runner (features 26, 27); it lives and dies inside the chat thread.
**Done when:** a student can say setup a quiz in chat, answer setup questions by tap or text, practice untimed with no clock shown and no cutoff, see auto marking plus running score plus updated attempts and retakes, get full correction at completion, and hear a clear handoff when the separate quiz page fits better.

spec ../specs/0031-quiz-practice-inside-chat/index.md

- [x] Design it (spec): /solution-architect quiz practice inside chat

- [ ] Build it: /feature-build quiz practice inside chat
  - [ ] Migration plus setup flow through reused reply chips (covers AC-1, AC-3, AC-4, AC-8)
  - [ ] Runner card with rebuild from thread (covers AC-2, AC-5)
  - [ ] Submit plus mark plus correction plus reprompt (covers AC-3, AC-6)
  - [ ] Handoff plus caps parity wiring (covers AC-7, AC-8)
  - [ ] Tests for happy path plus reload plus foreign 404 plus caps (covers all ACs)
- [ ] Verify it: /verify-release quiz practice inside chat
- [ ] Test it: /test-engineer quiz practice inside chat

### 57. Tutor voice and citation habit · Slice 2 · planned · needs a decision

Tip reads like a teacher, not a search result. It names the note once per topic, then teaches without repeating from your notes chapter X on every turn, keeping citations short (a page tag or a short quote only where proof matters). Groundedness stays: claims still trace to the note, but the trace stops interrupting the lesson. This revisits the quote plus name rule in the chat prompt and its overlap with the page citation work in feature 54.
**Done when:** a revision chat names the note once, then teaches across turns with no repeated from your notes preamble, citations appear only as short page tags or quotes where proof matters, and answers still trace to note content when checked.
- [ ] Design it (spec): /solution-architect tutor voice and citation habit
