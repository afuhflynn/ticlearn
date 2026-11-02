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

- [x] Build it: /feature-build quiz practice inside chat · code in `components/chat/quiz-runner.tsx`, `components/chat/chat-quiz.tsx`, `lib/chat/quiz-snapshot.ts`, `lib/ai/tools.ts` (`startQuiz`), `prompts/tools/start_quiz.md`, `lib/chat/activity-labels.ts`, `app/api/quizzes/grade/route.ts`, `app/api/quizzes/attempts/route.ts`, `app/api/quizzes/generate/route.ts`, `hooks/useQuizzes.ts`, `lib/api-client.ts`, `prisma/migrations/20261031000000_add_quiz_attempt_chat_columns/`, `prompts/chat/chat_system.md`
  - [x] Migration plus setup flow through reused reply chips (covers AC-1, AC-3, AC-4, AC-8)
  - [x] Runner card (covers AC-2: lettered cards plus typed letters with positional mapping; reload rebuild through the browser snapshot plus the active pointer, run state is ephemeral in sessionStorage, AC-5 built)
  - [x] Submit plus mark plus correction plus reprompt (covers AC-3, AC-6: one fixed reprompt, then the best guess is read aloud and scored; short open answers reprompt once, then grade anyway; attempts route allowlists the source hint and returns duplicate true on a repeated run id)
  - [x] Handoff plus caps parity wiring (covers AC-7, AC-8: attempts route checks quiz ownership with foreign ids reading as not found; runner shows the handoff card on 2 plus cited visuals with fixed copy and a link; tutor prompt hands the full quiz page link on a review or print ask via getUserQuizzes; caps parity locked by test)
  - [x] Tests for happy path plus reload plus foreign 404 plus caps (covers all ACs) · API tests for submit, dedupe, grade, foreign 404, caps parity and the source allowlist; snapshot helper tests (8 passed); runner component tests for the happy path, the fixed reprompt, the note gate and the reload rebuild
- [ ] Verify it: /verify-release quiz practice inside chat
- [x] Test it: /test-engineer quiz practice inside chat

### 57. Tutor voice and citation habit · Slice 2 · in-progress

Tip reads like a teacher, not a search result. It names the note once per topic, then teaches without repeating from your notes chapter X on every turn, keeping citations short (a page tag or a short quote only where proof matters). Groundedness stays: claims still trace to the note, but the trace stops interrupting the lesson. This revisits the quote plus name rule in the chat prompt and its overlap with the page citation work in feature 54.
**Done when:** a revision chat names the note once, then teaches across turns with no repeated from your notes preamble, citations appear only as short page tags or quotes where proof matters, and answers still trace to note content when checked.
- [x] Design it (spec): /solution-architect tutor voice and citation habit · spec ../specs/0032-tutor-voice-citation-habit/index.md
- [x] Build it: /feature-build tutor voice and citation habit
  - [x] Chat prompt to version 14 plus examples in the voice examples file (covers AC-1, AC-2, AC-3, AC-5, AC-7)
  - [x] Chat voice tests for naming, preamble, quote, and page source (covers AC-1, AC-2, AC-4, AC-7)
  - [x] Quiz correction parity plus thin evidence pivot plus lint and suite (covers AC-5, AC-6) · code in prompts/chat/chat_system.md, prompts/chat/voice_examples.md, prompts/grade/, prompts/retry/, tests/prompts/tutor-voice.test.ts
- [ ] Verify it: /verify-release tutor voice and citation habit
- [ ] Test it: /test-engineer tutor voice and citation habit

### 58. Agentic quiz setup wizard · in-progress
Tip guides setup as a three step wizard inside chat. Topic picks come first, then level plus format, then count plus difficulty. Each step shows numbered tappable options plus an inline Other box with a send arrow plus an Or reply directly line plus Skip plus Back plus Next. A typed reply in the composer moves the same step forward. No browser prompt appears at any point and the thread never stalls waiting for a tap that never lands.
**Done when:** a student can open setup in chat, pick topic plus level plus count by tap or by typing in the inline Other box or the composer, move back and forward with Skip, and reach a ready runner with no browser prompt and no stall.
- [x] Design it (spec): /solution-architect agentic quiz setup wizard · spec [0033](../specs/0033-agentic-quiz-setup-wizard/index.md)
- [x] Build it: /feature-build agentic quiz setup wizard · code in `components/chat/quiz-setup-wizard.tsx`, `lib/chat/quiz-wizard.ts`, `lib/chat/quiz-snapshot.ts`, `app/api/quizzes/wizard-generate/route.ts`
  - [x] Snapshot plus wizard card shell with pager plus Skip plus Back plus Next plus collapsed draft (covers AC-1, AC-5, AC-7)
  - [x] Topic plus level plus count steps with resolve plus defaults plus typing path (covers AC-2, AC-3, AC-4, AC-6)
  - [x] Wizard endpoint plus retry smaller then handoff plus caps parity (covers AC-8, AC-9)
- [ ] Verify it: /verify-release agentic quiz setup wizard
- [x] Test it: /test-engineer agentic quiz setup wizard

### 59. Low docked runner card · in-progress
The runner lives low near the composer as a docked sheet above the reply box, matching the approved reference. It shows one question at a time with numbered dots plus Back plus Next plus Show hint plus a Quiz plus Flashcards toggle. Taps answer at once, reload rebuilds the same spot with answers kept, and a stopped stream marks cleanly with no lost tap. Phone thumbs reach options without scrolling past a tall thread.
**Done when:** the runner docks low above the composer, shows one question at a time with dots plus Back plus Next plus Show hint, taps answer at once with no stall, reload rebuilds the same spot, and placement matches the approved reference on phone and desktop.
- [x] Design it (spec): /solution-architect low docked runner card · spec [0034](../specs/0034-low-docked-runner-card/index.md)
- [x] Build it: /feature-build low docked runner card · code in `components/chat/quiz-runner.tsx`, `lib/chat/quiz-snapshot.ts`, `lib/ai/validators.ts`, `lib/inngest/functions.ts`, `prompts/quiz/quiz_from_note.md`, `prompts/quiz/grounded_from_note.md`, `components/chat/chat-thread.tsx`
  - [x] Docked shell plus free movement with dots jump (covers **AC-1**, **AC-2**, **AC-3**)
  - [x] Instant tap plus toggle plus per question hint (covers **AC-4**, **AC-7**, **AC-8**)
  - [x] Snapshot v3 plus reload plus fail keep with retry (covers **AC-5**, **AC-6**, **AC-8**)
  - [x] Phone height cap plus access path plus tests (covers **AC-9**, **AC-10**)
- [ ] Verify it: /verify-release low docked runner card
- [ ] Test it: /test-engineer low docked runner card

### 60. Marking plus mark scheme plus results plus save · in-progress
Each answer marks the moment it lands with correct plus incorrect styling plus the mark scheme that shows where each mark comes from. The end state shows percent plus correct count plus per question review plus Start over plus a weak area follow up that offers a harder set or an open written set for marking. The run saves to attempts so progress counts, and a review or print ask hands to the full quiz page with a clear link.
**Done when:** each answer marks at once with correct plus incorrect plus mark scheme, the end shows percent plus correct count plus per question review plus Start over plus weak area follow up, and the run saves to attempts so progress counts.

spec ../specs/0035-marking-mark-scheme-results-save/index.md

- [x] Design it (spec): /solution-architect marking plus mark scheme plus results plus save
- [x] Build it: /feature-build marking plus mark scheme plus results plus save · code in `components/chat/quiz-runner.tsx`, `lib/chat/quiz-snapshot.ts`, `lib/ai/validators.ts`, `lib/api-client.ts`, `lib/inngest/functions.ts`, `app/api/quizzes/grade/route.ts`, `app/api/quizzes/attempts/route.ts`, `app/api/quizzes/wizard-generate/route.ts`, `app/api/quizzes/generate/from-weak-areas/route.ts`, `prisma/migrations/20261031090000_add_quiz_marking_columns/`, `tests/components/quiz-runner.test.tsx`, `tests/app/api/quiz-grade.test.ts`
  - [x] Marks plus scheme columns plus grade reply shape, covers **AC-1**, **AC-2**, **AC-8**
  - [x] Runner instant marking plus nav plus hint plus reload, covers **AC-3**, **AC-4**
  - [x] Results plus Start over plus one submit plus weak area offers, covers **AC-5**, **AC-6**, **AC-7**, **AC-9**
  - [x] Retry then handoff plus owner checks plus caps parity, covers **AC-10**, **AC-11**, **AC-12**
- [ ] Verify it: /verify-release marking plus mark scheme plus results plus save
- [ ] Test it: /test-engineer marking plus mark scheme plus results plus save

### 61. Quiz reliability plus visual fallback · in-progress
Generation plus marking plus drawing stay dependable under real model limits. A length cutoff retries with a smaller set then hands to the full quiz page instead of a dead Quiz not available card. The draw tool carries a proper activity label so Working reads cleanly, draw failures show a plain notice with text instead plus a retry, and duplicate message warnings stay in logs out of the student view. Topic mix stays student choice with Quiz plus Flashcards available where it helps recall.
**Done when:** generation never ends on a dead card, a length cutoff retries with a smaller set then hands to the full quiz page, draw failures show a plain notice with text instead plus a retry, the draw tool has a proper activity label, and duplicate message warnings stay out of the student view.
- [x] Design it (spec): /solution-architect quiz reliability plus visual fallback · spec [0040](../specs/0040-quiz-reliability-visual-fallback.md)
- [x] Build it: /feature-build quiz reliability plus visual fallback
  - [x] Draw label plus duplicate hygiene in the label map (covers AC-5, AC-6)
  - [x] Cutoff detection plus one server retry plus handoff card (covers AC-1, AC-2, AC-3)
  - [x] Draw text fallback with manual retry running parallel to text (covers AC-4)
  - [x] Quiz plus Flashcards parity with owner checks on every exit (covers AC-7)
- [x] Verify it: /verify-release quiz reliability plus visual fallback
- [x] Test it: /test-engineer quiz reliability plus visual fallback

### 62. Smart setup that knows you · in-progress
Tip reads profile plus programs plus notes before it asks anything, so it never asks level again and never treats a note title as a topic. It picks topics from inside the note and asks only the missing piece one at a time.
**Done when:** a student starting a quiz sees no level ask when level lives in profile, topic options come from note content, and each reply moves one step forward by tap or by typing.
- [x] Design it (spec): /solution-architect smart setup that knows you · spec [0041](../../specs/0041-smart-onboarding-chat-setup/index.md)
- [x] Build it: /feature-build smart setup that knows you
  - [x] Progress store plus setup routes with owner checks (covers AC-4, AC-7, AC-8)
  - [x] Chat led UI plus guard plus skip and resume (covers AC-1, AC-2, AC-3, AC-4)
  - [x] Validation plus Tip wiring plus funnel logs (covers AC-5, AC-6)
- [ ] Verify it: /verify-release smart setup that knows you
- [x] Test it: /test-engineer smart setup that knows you

(basis: onboarding profile plus programs in the database, note content as topic source, progressive disclosure asks one thing at a time)

### 63. Durable quiz build with live progress · needs a decision
Long builds run in background jobs that survive slow models, with true stage names and live updates in thread, so silence never feels dead.
**Done when:** a 40 question build shows progress in seconds, survives a model cutoff by retrying smaller, and refreshes to ready without a dead stall.
- [ ] Design it (spec): /solution-architect durable quiz build with live progress

(basis: Inngest background jobs per root AGENTS.md, pending region plus process progress per loading states row 35, retry smaller then handoff per row 61)

### 64. Clean activity plus true answer split · needs a decision
Working steps collapse to one small line while building, then one clean final answer lands with no repeats, so inner chatter never leaks to the student.
**Done when:** the thread shows one activity line with human labels, expands on tap, and the final answer starts where it should with no duplicated build chatter.
- [ ] Design it (spec): /solution-architect clean activity plus true answer split

(basis: labelled activity line per research/chat-experience.md, strict split of build chatter and final answer per your reference shots)

### 65. Generative card system low near composer · needs a decision
Quiz plus flashcards plus diagrams share one docked card family low above the reply box, with dots plus Back plus Next plus hint, so thumbs reach options without scrolling past a tall thread.
**Done when:** the runner docks low, shows one item at a time with dots plus Back plus Next, taps answer at once, reload rebuilds the same spot, and placement matches the approved reference on phone and desktop.
- [ ] Design it (spec): /solution-architect generative card system low near composer

(basis: low docked runner per row 59, thumb reach on phones per mobile bar row 33, one card family for quiz plus flashcards plus diagrams)

### 66. Honest failure plus two paths · needs a decision
A failed build shows a calm modern card with plain words and two live exits, so practice never ends dead.
**Done when:** a failed build never shows a dead card, offers a smaller chat quiz now plus a full page quiz link, and a tap retries or moves forward cleanly.
- [ ] Design it (spec): /solution-architect honest failure plus two paths

(basis: honest failure with retry per loading states row 35, two live exits per your failed build ask, never a dead end)

### 67. Simple true visuals with fallback · needs a decision
Science sketches render as clean line art first, with text steps beside them, and a failed draw shows plain notice plus retry instead of a dead card.
**Done when:** a light ray or similar ask shows a readable visual, text steps stay beside it, a failed draw shows notice plus retry, and the draw tool has a proper activity label.
- [ ] Design it (spec): /solution-architect simple true visuals with fallback

(basis: visual page analysis per hackathon row 50, draw activity label per row 61, text steps beside art so a failed draw still teaches)

## References

Project sources you can open in the repo.
1. Onboarding profile plus programs plus note content in the database.
2. Root AGENTS.md on Inngest background jobs and the loading states rule.
3. Loading states row 35 with pending region plus process progress plus honest failure.
4. Quiz rows 56 plus 58 plus 59 plus 60 plus 61 with practice plus wizard plus docked runner plus marking plus reliability.
5. Hackathon row 50 with visual page analysis.

Practices and standards named in the basis lines, no links here.
1. Progressive disclosure asks one thing at a time.
2. One labelled activity line while working, then one clean final answer.
3. Honest failure with retry plus an alternate path, never a dead end.

Links verified by fetch on this run, for a human to follow.
1. [Progressive Disclosure, Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
2. [Inngest Realtime, Stream Updates from Functions](https://www.inngest.com/docs/realtime)
3. [Chatbot Tool Usage, Vercel AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
4. [Error Message Guidelines, Nielsen Norman Group](https://www.nngroup.com/articles/error-message-guidelines/)
