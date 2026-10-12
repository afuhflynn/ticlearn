# Chat Interface Rebuild — UX and Technical Research

**Prepared:** 2026-10-12
**Scope:** How ChatGPT, Claude, Gemini and Perplexity disclose reasoning and tool use, design the composer, seed a new chat, expose tool control, hit speed targets, and handle attachments — mapped onto the current TiC chat implementation.
**Audience constraints:** Cameroonian university students, first market Buea and Bamenda. Phone first, >90% no laptop, low-end Android, data at ~1.63 USD/GB with 2–5 USD/month of internet, shared phones, WhatsApp-native, English first.

**Method:** Firecrawl search + scrape against primary vendor documentation, vendor research blogs, teardown sites, Google Play / App Store listings and review threads, and engineering write-ups on streaming latency. Raw scraped evidence is in `.firecrawl/`. Every URL below was fetched and read. Where a claim is observation rather than documented behaviour, it is labelled **[observed]**.

---

## 0. Audit of what we have today

Before the research, the current build. This is the gap list.

### 0.1 Where tool calls are rendered

`components/chat/chat-message-list.tsx:120-153` — `ToolParts` maps every tool part to a bordered `Collapsible` from `components/ai-elements/tool.tsx`:

- Title comes from `getToolTitle()` (`chat-message-list.tsx:56-62`), which strips the `tool-` prefix and naively splits camelCase. So `tool-webSearch` renders as **"Web Search"**, `tool-getUserNotes` as **"Get User Notes"**, `tool-searchNotes` as **"Search Notes"**, `tool-createQuiz` as **"Create Quiz"**.
- A `WrenchIcon` plus a status `Badge` from `tool.tsx:39-66`: `Pending` / `Running` / `Completed` / `Error` / `Awaiting Approval`.
- `defaultOpen={part.state !== "output-available"}` (`chat-message-list.tsx:132`) — collapsed once done, expanded while in flight.
- Expanded, `ToolInput` dumps the raw tool arguments as pretty-printed JSON in a `CodeBlock` under a `PARAMETERS` heading, and `ToolOutput` dumps the raw return payload under a `RESULT` heading (`tool.tsx:105-163`).

**This is the bug the user perceives.** `Get User Notes` + a JSON blob reads as a developer console leaking into a student app. Northbase's survey of 233 AI output instances across 12 systems found that 6 of 12 systems use action-specific status text rather than a generic "Thinking", and explicitly recommends: *"Match the loading label to the actual operation rather than using a generic 'Thinking' for every request."* ([northbase.design](https://www.northbase.design/patterns/ai-output))

### 0.2 Where reasoning is rendered

`chat-message-list.tsx:270-275` renders `Reasoning` with a hardcoded `duration={0}`. `reasoning.tsx:125-133` treats `duration === 0` as still-streaming, so the trigger permanently renders `<Shimmer>Thinking...</Shimmer>` and never advances to "Thought for N seconds". The block sits *after* the sources block and *before* the answer text.

Fallback copy exists in the component and is never reached: "Thought for a few seconds" / "Thought for {duration} seconds".

### 0.3 The streaming placeholder

`chat-message-list.tsx:327-333` renders a `Loader` + "TiC is thinking…" only when `status` is `submitted`/`streaming` **and** the last message is not an assistant message. So during the actual model round trip there is often nothing at all in the thread.

### 0.4 Assets we already own and are not using

| Asset | Location | Status |
| --- | --- | --- |
| `ChainOfThought` (numbered steps, vertical connector line, per-step status) | `components/ai-elements/chain-of-thought.tsx` | **Dead code** — zero usages outside `ai-elements/` |
| `SpeechInput` (Web Speech API, `continuous`, `interimResults`, lang) | `components/ai-elements/speech-input.tsx` | **Dead code** — not wired into `chat-composer.tsx` |
| `Shimmer` (gradient text sweep, 2s linear, muted-foreground) | `components/ai-elements/shimmer.tsx` | Live, used by reasoning only |
| `Attachment`/`Attachments` with `grid \| inline \| list` variants, `AttachmentHoverCard` | `components/ai-elements/attachments.tsx` | Live, but `HoverCard` variants are unused |
| `PromptInputActionMenu` (+ menu), `PromptInputTools` (left rail), `PromptInputSubmit` (status-aware icon) | `components/ai-elements/prompt-input.tsx` | Live |

### 0.5 Composer gaps

- `PromptInputTextarea` (`prompt-input.tsx`) is a plain `<textarea>` with **no auto-grow implementation** — `grep` for `scrollHeight` / `maxHeight` / `rows` returns nothing. It inherits the **browser default resize handle**, which is the handle we do not want.
- **No voice input.** `SpeechInput` exists and is unused.
- **No tool/mode chips row.** The `+` menu contains exactly one item, `PromptInputActionAddAttachments` (`chat-composer.tsx:219-225`).
- **Send button is disabled while streaming** (`chat-composer.tsx:227`), not a stop button. `PromptInputSubmit` *does* render a `SquareIcon` for `status === "streaming"` (`prompt-input.tsx`), so the stop affordance exists in the design system but is unreachable.
- **Draft is component-local `useState`** (`chat-composer.tsx:72`) — lost on navigation, lost on refresh. Only the landing→thread handoff survives, via `sessionStorage` in `pending-message.ts`.
- Mobile Enter-key handling is already correct: `chat-composer.tsx:94-110` intercepts Enter on coarse pointers and inserts a newline. This matters more than it looks — see §2.6.
- Placeholder swaps to "Uploading files…" during upload, and the composer is `disabled` during upload (`chat-composer.tsx:206-213`), so the student cannot type while a photo uploads.

### 0.6 Server side

`app/api/ai/chat/route.ts` uses `streamText` with `google("gemini-2.5-flash")`, `stopWhen: stepCountIs(5)`, and returns `result.toUIMessageStreamResponse({ sendReasoning: true, sendSources: true })`.

AI SDK v6 (`ai@^6.0.149`, `@ai-sdk/react@^3.0.151`) exposes the full tool-state union on the client (verified in `node_modules/ai/dist/index.d.ts:1893-1963`):

`input-streaming` → `input-available` → (`approval-requested` → `approval-responded`) → `output-available` | `output-error` | `output-denied`

Plus `providerExecuted`, `callProviderMetadata`, `resultProviderMetadata`, and a `preliminary` flag on `output-available`. `isToolOrDynamicToolUIPart`, `isReasoningUIPart`, `isTextUIPart` are all available and already used. Part-level render guidance is in the [AI SDK chatbot docs](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot).

**The block is `generateTitle`** (`route.ts:235-248`): a non-streaming `generateText` call to Gemini on the first message, awaited inline **before** `streamText` is ever called. That is a full extra model round trip on the critical path of every new chat — directly against the "start streaming almost immediately" requirement. See §5.

### 0.7 Tools exposed to the model

`lib/ai/tools.ts` defines 11 tools: `webSearch`, `getUserNotes`, `searchNotes`, `getNoteContext`, `getUserQuizzes`, `getQuizContext`, `getQuizAttemptHistory`, `getStudyProgress`, `getSubscriptionContext`, `createQuiz`, `searchKnowledge`.

---

## 1. How thinking and tool use is disclosed

This is the core problem, so this section is the longest.

### 1.1 The governing finding

Northbase analysed 233 AI output instances across ChatGPT, Claude, Gemini, Perplexity, Copilot, GitHub Copilot, v0, Notion AI, Google Docs, Airtable, Retool and Atlassian Rovo ([source](https://www.northbase.design/patterns/ai-output)). Three results decide our design:

1. **100% of the systems let users stop generation mid-response.**
2. **6 of 12 systems describe what the AI is doing, not just "Thinking."** ChatGPT shows *"Searching for tech news today"*; Perplexity displays *"Reviewing sources · 10"*; Airtable renders *"Building tables"*. Their verdict: *"This approach builds trust by explaining delays and shows users the AI is actively working, not stuck."*
3. **Claude, Gemini, v0 and Retool all show visible thinking traces, but none expand them by default.** Claude uses a collapsible "Thought process" section with a beige background. v0 streams real-time reasoning text and adds a **"Worked for 30s"** duration badge. Retool shows numbered step progress with expandable sections. Their recommendation: *"Collapse thinking traces by default and let users expand on demand. Most users want the answer, not the reasoning. Expanded thinking pushes the actual response below the fold."*

v0 is the exception on duration copy: **"Worked for 30s"**, not "Thought for 30s".

### 1.2 ChatGPT (primary reference)

**What is visible by default.** The raw chain of thought is never shown. What the user sees is a one-line collapsible summary above the answer, plus a `Sources` control and inline citations.

**The composer source picker.** Per [OpenAI's web search help article](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt): *"ChatGPT may search the web automatically when your question would benefit from current information."* The manual path is `+` → **Search**, or typing `/` in the composer and selecting **Search**. The picker screenshot alt-text on that page reads *"ChatGPT composer source picker with Search listed under Sources and set to Auto"* — i.e. the default is **Auto**, with **Search** as a per-message override, and regenerate offers *"Try again"* or *"Search the web"*.

**Thinking levels.** Per [GPT-5/GPT-6 in ChatGPT help](https://help.openai.com/en/articles/11909943-gpt-5-in-chatgpt): a **Thinking** slider with labelled levels — **Instant** (essentially none), **Medium** — *"Standard thinking."*, **High** — *"Extended thinking."*, **Extra High** — *"The highest thinking level available."* On Free/Go, reasoning was made an explicit choice rather than automatic: *"free users will now use GPT-5.2 Instant by default, and can still choose to use reasoning anytime by selecting **Thinking** from the tools menu in the message composer."*

**Streaming behaviour.** *"A response may begin while ChatGPT continues thinking, followed by more detail."* — the answer is not gated behind the thinking phase. This is the single most important behaviour to copy.

**Frustration with the thinking indicator is real and documented.** An OpenAI community thread reports *"intermittent … missing thinking time UI"* on GPT-5.6 Sol High ([community.openai.com](https://community.openai.com/t/gpt-5-6-sol-high-intermittent-reasoning-collapse-missing-thinking-time-ui-and-possible-temporary-chat-state-regression/1394404)) — users notice when the indicator is missing or wrong. Separately, Gemini *removed* "Show thinking" on a model downgrade and the community reacted sharply ([r/GeminiAI](https://www.reddit.com/r/GeminiAI/comments/1rhg687/gemini_31_pro_downgrade_why_show_thinking_was/)). Lesson: **the indicator is load-bearing.** Remove it and users read the wait as a bug.

### 1.3 Claude

Claude is the cleanest reference for separating *thinking* from *tool use*, because they are genuinely different things in its API.

**Two separate controls, documented as separate.** Per [Claude Help — Change the model, effort, and thinking settings](https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings):

> "Thinking and effort are separate settings… The effort level controls how thorough Claude is with every response. The thinking toggle controls whether Claude works through its reasoning in an expandable section before responding."

The model menu sits **next to the send button** and carries model + effort + thinking. On models with effort levels, you get to it by: hover **Effort** → switch the **"Thinking"** (or **"Extended"**) toggle.

**Exact on-screen copy when thinking is enabled:**

> - *"A 'Thinking' indicator with a timer showing how long Claude has been processing."*
> - *"An expandable 'Thinking' section above Claude's response."*
> - *"Click the 'Thinking' section to view Claude's thought process summary and problem-solving approach."*

Two things to steal: the **timer runs live during processing**, and the section sits **above** the response.

**Errors inside thinking.** Claude has a first-class, user-readable failure string:

> *"Occasionally, you may notice that Claude's thinking stops before it's complete, with a message stating that the rest of Claude's thought process is not available."*

**Why thinking differs from tool use, at the model layer.** Per [Extended thinking docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking): thinking is a **token budget** (`budget_tokens`) the model spends before its final answer, billed as `usage.output_tokens_details.thinking_tokens`. Responses come back as *"summarized thinking blocks and text blocks"* — a summary, never raw tokens. **Interleaved thinking** is the separate mechanism that lets Claude think *between tool calls*: *"Interleaved thinking lets Claude think between tool calls within a single assistant turn, reasoning about each tool result before determining what to do next."* So in Claude's model, thinking is not a tool and not a log line — it is a resource allocation, and interleaved thinking is what makes tool loops coherent.

**Safety and faithfulness caveats, quoted, because they constrain what we can legitimately claim.** Per [Claude's extended thinking research post](https://www.anthropic.com/research/visible-extended-thinking):

> "As with human thinking, Claude sometimes finds itself thinking some incorrect, misleading, or half-baked thoughts along the way."
> "models very often make decisions based on factors that they _don't_ explicitly discuss in their thinking process."
> On encryption: *"they will see the message 'the rest of the thought process is not available for this response'."*

This is why Claude shows a **summary**, and why we must not stream a raw trace to students as though it were truth.

### 1.4 Gemini

Per [Google's Deep Research tips](https://blog.google/products-and-platforms/products/gemini/tips-how-to-use-deep-research/):

> "While Gemini is busy researching and writing your report, you'll see options for **'Show thinking'** and **'Sites browsed.'** If you select 'Show thinking,' the model will give you a look at the steps it's taking to generate your report."

So Gemini splits the disclosure into **two independent affordances**: the process (`Show thinking`) and the evidence (`Sites browsed`). It also notes you can *"review the sites coming up and if something catches your attention while you're waiting … you can click to open it in another tab."*

Other Gemini surfaces use **"Show thinking steps"** under a **More** menu at the bottom of a response ([Google Help](https://support.google.com/gemini/answer/18648722)). Deep Research and thinking settings also live in the model picker with plain-language copy ([aiuxplayground Gemini teardown](https://aiuxplayground.com/teardowns/gemini/composer)).

**Consistency is not free.** A Gemini support thread titled *"Thinking Mode not appearing for specific prompts"* notes *"For the problematic prompt, there is no 'Show thinking' section in the response"* ([support.google.com](https://support.google.com/gemini/thread/407220675)) — when the affordance is conditionally absent, users file it as a defect.

### 1.5 Perplexity

The most literal, most verbose pattern — and the one to watch, not copy. Per northbase: multi-step loading with a **`"Working..."`** status, a **`"Searching the web"`** step, and **`"Reviewing sources · 10"`** with the source list populating live. Responses close with a collapsible **"Reviewed 10 sources"** header and superscript citations (`contentful+1`, `salesforce+1`).

The value: *named steps with a live count*. The cost: a tall stack of chrome above every answer, which on a 1.63 USD/GB connection in Buea pushes the actual answer below the fold and costs bandwidth re-renders.

### 1.6 Exact vocabulary to copy

| Situation | ChatGPT | Claude | Gemini | Perplexity | **Use for TiC** |
| --- | --- | --- | --- | --- | --- |
| Generic in-flight state | *"Thinking…"* | *"Thinking"* + live timer | *"Show thinking"* | *"Working..."* | **`Checking your notes…`** / **`Searching the web…`** |
| Completed reasoning | collapsed summary line | *"Thinking"* section, collapsed, above answer | *"Show thinking"* toggle | step stack | **`Thought for 4s`**, collapsed, above answer |
| Web search, running | *"Searching for tech news today"* (the user's own words, echoed) | web search on by default, no chip | *"Sites browsed"* | *"Searching the web"* | **`Searching the web for “<query>”`** |
| Web search, done | inline citations + `Sources` | teal source chips | *"Sites browsed"* list | *"Reviewed 10 sources"* | **`Read 5 sources`** (collapsed) |
| Retrieval of user's own library | — | — | — | — | **`Reading your notes`** |
| Quiz / practice generation | — | — | — | — | **`Setting up your practice…`** |
| Error inside a step | inline error + retry control | *"the rest of the thought process is not available for this response"* | falls back to no section | inline | **`Couldn't reach the web. Answering without it.`** |
| Duration hint | absent | live timer, then total | absent | absent | **`Thought for 4s`** |

The strongest single rule: **echo the user's own words in the in-flight label.** ChatGPT's *"Searching for tech news today"* works because the student sees their own question restated. For us that means *"Searching the web for 'co-ordinate geometry 2023 paper'"*, not *"webSearch"*.

### 1.7 Errors and retries inside a trace

Nobody publishes a clean answer here, so this is our design, constrained by what the vendors do:

- **Never show a raw `errorText` from `output-error` to a student.** Our `summarizeToolPart()` already has the right idea (`chat-message-list.tsx:73-75`) but it is only reachable when there is *no* text part. Make the friendly string the *primary* rendering and move raw JSON behind an explicit "Technical details" disclosure that is off by default.
- **Recover in place, visibly.** Claude's pattern — the section stays, shows what stopped, and explains why. A step that silently disappears reads as data loss.
- **A failed web search should not fail the answer.** Our system prompt already says *"If the available tools do not provide enough information, say so plainly."* Surface it as one neutral line in the activity block.

### 1.8 Does anything stream progressively?

Yes, and this is the pattern we want. Northbase found v0 streams *real-time thinking text*. Claude streams the thinking summary progressively. OpenAI explicitly documents that *"A response may begin while ChatGPT continues thinking."* Our `streamText` + `toUIMessageStreamResponse` already delivers `input-streaming` → `input-available` → `output-available` as distinct part states — we simply render them all as the same Wrench box.

---

## 2. The composer

The best available cross-product teardown is [aiuxplayground's composer comparison](https://aiuxplayground.com/teardowns/compare/design-the-composer), backed by individual teardowns for [ChatGPT](https://aiuxplayground.com/teardowns/chatgpt/composer), [Claude](https://aiuxplayground.com/teardowns/claude/composer), [Perplexity](https://aiuxplayground.com/teardowns/perplexity/composer) and [Gemini](https://aiuxplayground.com/teardowns/gemini/composer).

### 2.1 The shared skeleton

All four converge on the same shape: **calm empty input → `+` menu on the left for capability → removable chip for scope → send on the right.** Per-product:

| | Default bar | Tool/mode disclosure | Send button position |
| --- | --- | --- | --- |
| **ChatGPT** | Empty bar, no chips; starter pills hint at jobs | One `+` menu for attach + modes; removable chips show scope before send | Right |
| **Claude** | Empty card with starter pills; **model and effort visible on the right before you type** | `+` menu; **web search on by default with no chip**; flyouts for skills/connectors | Right |
| **Perplexity** | **Search chip visible on first load** | Mode chips (Search, Computer) are primary; `+` handles uploads and connectors | Right |
| **Gemini** | Empty pill bar, no chips | `+` menu leads with Drive; Deep research in a flyout | Right |

The critical structural finding for us: **Claude and Perplexity put the mode control in the bar or default it on. ChatGPT hides it in the `+` menu.** Since our requirement is *web search on by default with the system deciding*, **Claude is the reference, not ChatGPT.**

### 2.2 Auto-grow, max height, internal scroll

No vendor publishes this. Observed behaviour across all four: the textarea grows with content to roughly 5–8 lines, then becomes internally scrollable and the whole composer stops growing, so the thread keeps the majority of the viewport.

Material's guidance is the closest citable anchor on the rest of the loading spectrum ([M3 progress indicators](https://m3.material.io/components/progress-indicators/guidelines)): **under 200ms show content immediately; 200ms–5s use a loading indicator; over 5s use a progress indicator;** and *"If the wait is very long, consider allowing people to navigate away."*

**For us:** grow to ~6 lines (~120px), then internal scroll; cap at roughly 35% of viewport height so the thread never disappears behind a shared phone keyboard.

### 2.3 The send button and its states

`PromptInputSubmit` already implements the correct state machine (`prompt-input.tsx`):

- `ready` → `CornerDownLeftIcon` (send)
- `submitted` → `Loader2Icon` spinning
- `streaming` → `SquareIcon` (**stop**)
- `error` → `XIcon`

Our `chat-composer.tsx:227` defeats it by passing `disabled={... || status === "streaming"}`, which removes the stop button exactly when it is most needed. Northbase: **100% of surveyed systems let users stop mid-response.** On a metered 1.63 USD/GB connection, being unable to stop a runaway generation is a real cost harm, not just a UX nicety.

### 2.4 The `+` / paperclip menu

All four hide attach behind `+`. Multiple teardowns flag this as the shared mistake: *"Attach inside the `+` menu fights the paperclip habit from email and Slack. Sending a file is not an edge case."* (ChatGPT teardown) / *"Uploading files is core to research workflows"* (Perplexity teardown).

**Context decides.** Our students' primary job *is* photographing a past paper — Gauth's own positioning is literally *"Simply take a photo of your problem, and Gauth will recognize it and crop your question automatically"* ([Google Play](https://play.google.com/store/apps/details?id=com.binogi)), and Photomath leads with *"Scan any math problem … Whether handwritten, in a textbook, or on a screen"* ([photomath.app](https://photomath.app/)). For that audience, **a visible paperclip on the bar beats a `+` menu**, and a camera-first entry point beats both.

### 2.5 Voice input

All four have it. ChatGPT's bar mic does **inline dictation** — *"Dictation replaces the text field. Waveform, cancel, confirm"* — with a *separate* full-screen voice conversation mode. Claude has *"Voice transcription with confirm before send."* Gemini puts the mic *"on the compose row as a peer to typing."*

The consistent pattern worth copying: **dictation replaces the text field, shows a waveform, and requires explicit confirm/cancel.** It never silently appends.

We already own `components/ai-elements/speech-input.tsx` with `continuous`, `interimResults` and `lang` — wired up nowhere. For an audience that is WhatsApp-native and often typing in a noisy shared room, dictation is a genuine accessibility win, and the confirm/cancel contract prevents an embarrassing wrong send on a shared phone.

### 2.6 Enter vs Shift+Enter — and why our current code is right

The pattern across all four: **desktop Enter sends, Shift+Enter newline; mobile Enter newline, send via the button.**

That mobile half matters enormously and is verifiable from public complaints:

- r/ChatGPTcomplaints: *"Line Break key now sends message instead of starting new paragraph … Expected behaviour: Enter should insert a newline, Send button should submit the message."* ([thread](https://www.reddit.com/r/ChatGPTcomplaints/comments/1rsvwsy/android_app_line_break_key_now_sends_message/))
- A Google support thread on the same regression in Google AI Mode carries **229 people reporting the identical problem**, titled *"Keyboard 'Enter' button working as send button"* ([thread](https://support.google.com/websearch/thread/470201406)).
- An OpenAI community request to make newlines opt-in and Cmd/Ctrl+Enter the send key has a large agreeing cohort ([community.openai.com](https://community.openai.com/t/chatgpt-app-allow-toggle-newlines-and-cmd-ctrl-return-enter-for-submission/1253379)).

Our `chat-composer.tsx:94-110` already does the right thing (coarse-pointer detection → Enter inserts `\n`). Keep it, and make sure `Shift+Enter` still works as an explicit desktop send-adjacent affordance.

### 2.7 Character/token hints, mode chips, and long pastes

- **No vendor shows a character counter in the composer.** Don't add one.
- ChatGPT converts **pastes over 10k characters into attachments** automatically, with a *"Show in text field"* escape hatch to convert back ([release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)). Adopt the threshold idea; a student pasting a whole chapter should not blow the context window or the phone keyboard.
- Mode chips: Claude uses **no chip for web search** because it is simply on. ChatGPT uses removable chips that *"confirm what is in scope before send."* Perplexity keeps Search permanently visible.

### 2.8 The draft when you navigate away

No vendor documents this, so treat it as our own product decision grounded in audience reality. Two relevant facts:

- **ChatGPT/Perplexity suggestions**: *"Once the person sends a first message, starters should not resurface and compete with the thread."* ([prompt-starters pattern](https://aiuxplayground.com/pattern/prompt-starters))
- **NotebookLM's chat is deliberately ephemeral** — *"the chat page is ephemeral. When you close or refresh the browser, your chat will disappear"* ([DataCamp](https://www.datacamp.com/tutorial/notebooklm)).

Our behaviour today is the worst of both: the thread persists server-side, but an unsent draft — the most expensive thing to retype, especially on a metered connection where a phone-backed-up photograph may be gone from the gallery — dies with the component. **Persist the draft to `sessionStorage` (or `localStorage` for longer retention), keyed per conversation, exactly as `pending-message.ts` already does for the landing→thread handoff.** That pattern is already in the codebase; extend it.

---

## 3. Suggested prompts on a new chat

### 3.1 The pattern

From [aiuxplayground's Prompt Starters pattern](https://aiuxplayground.com/pattern/prompt-starters):

- **When:** *"ChatGPT, Claude, and Gemini all show concrete starter prompts on a fresh chat."* Only on a fresh chat. *"At the beginning of a new chat, you'll now see examples to help you get started"* — ChatGPT shipped this in its public launch notes, framed as *"A blank page can be intimidating."* ([release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes))
- **How many:** *"Offer 3 to 4 scannable task labels. Short labels like **Plan a trip** beat a wall of prefilled constraints. Specifics belong in the thread after send."*
- **Interaction:** *"Tapping a starter drops its prompt into the composer so the person can edit before sending"* — **fill, don't send**.
- **Dismissal:** *"Let typing replace the starters without friction. Once the person sends a first message, starters should not resurface."*
- **NotebookLM** extends this past the empty state: *"Suggested questions you may want to ask that are tailored to your documents"*, generated from the uploaded sources ([DataCamp](https://www.datacamp.com/tutorial/notebooklm)).

### 3.2 Mobile layout

No vendor publishes this. The constraint-driven answer: on a 360px-wide shared phone, **4 items in a 2×2 grid of full-width cards**, icon + 4–6 word label + one line of plain language. A horizontal chip scroller (what `ai-elements/suggestion.tsx` does today with `whitespace-nowrap` + hidden scrollbar) hides items behind a swipe that a first-year student on a 5 USD/month plan may never try.

### 3.3 Options for our audience

The teaching goal is specific: **students must learn that they can attach a photograph of a past paper or a lecture slide.** At least one starter, ideally two, must point at attaching.

**Option A — Attach-first (recommended).** Leads with the camera.

1. 📷 **Solve a past paper** — *Take a photo of a past-paper question and I'll show you how to answer it.*
2. 📄 **Explain my notes** — *Upload a lecture slide or note and I'll explain it simply.*
3. 🎯 **Quiz me** — *Test me on any topic I'm studying.*
4. 📅 **Plan my revision** — *Build me a study plan for my exam.*

**Option B — Goals-first.** Leads with the exam outcome. Weaker for the attach lesson, stronger for motivation.

1. *I'm preparing for December — help me plan.*
2. *I'm preparing for May/June — help me plan.*
3. *Quiz me on my weakest topic.*
4. *Take a photo of a past paper and solve it.*

**Option C — Adaptive (best, if data allows).** Pull from the profile we already compute. `lib/readiness.ts` gives us `weakestTopic`, `daysUntilExam` and program readiness, and the chat route already injects `STUDENT PROFILE` into the system prompt (`route.ts:294-305`). Make one of the four starters literally *"Quiz me on {weakestTopic} — I'm {N} days from my exam."* This is the single highest-leverage suggestion in the document: it converts a generic chat app into a tutor that already knows the syllabus, and the data is already computed.

**Draft copy for our students, in their exam-calendar vocabulary:**

| Card | Label | Sub-line | Teaches |
| --- | --- | --- | --- |
| Camera | **Solve a past paper** | Photograph a question. Get the answer and the marking scheme. | **Attaching** |
| Files | **Explain my notes** | Drop a slide or PDF. I'll break it down simply. | **Attaching** |
| Practice | **Quiz me** | 10 exam-style questions on any topic. | Prompting shape |
| Plan | **Plan my revision** | A week-by-week plan to your exam date. | Account/personalisation |

Note the deliberate **"Take a photo"** verb — matching Gauth and Photomath's category language — over "Attach", which is the exact word the teardowns flag as foreign to the audience.

**What to drop from today's `CHAT_SUGGESTIONS`:** `"Turn this uploaded question into a step-by-step solution"` refers to something the user has not done yet. That is a description, not an invitation.

---

## 4. User control of tools

### 4.1 What the products actually do

**ChatGPT — a three-state source picker.** From [OpenAI's web search article](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt): *"ChatGPT may search the web automatically when your question would benefit from current information."* Manual override via `+` → **Search**, or typing `/` and picking **Search**. The picker sits under a **Sources** heading with the default set to **Auto**. Regenerate offers *"Try again"* or *"Search the web."*

**This is exactly the interaction we need** — three states, system-decides by default, per-message force, plus a cheap "search again but differently" retry. Adopt verbatim.

**Claude — on by default, no chip.** Per the [Claude composer teardown](https://aiuxplayground.com/teardowns/claude/composer): *"Web search defaults on with no chip in the card. You just prompt. Claude skips the 'is this a search?' split ChatGPT forces with a separate mode."* Verified in the docs: web search is a **toggle inside the `+` menu** alongside attach, skills, connectors and style.

**Perplexity — source checkboxes.** Per the [Perplexity teardown](https://aiuxplayground.com/teardowns/perplexity/composer): *"Web and Academic as checkboxes teach source scope in plain language,"* with the upgrade banner at the top of the connectors flyout. Its critique of itself is instructive: *"Active sources (Web on) do not show as chips in the bar. Easy to forget what is connected."* Always show armed state in the bar.

### 4.2 The recommended interaction for us

A single **Sources** control, mirroring ChatGPT's picker, because it is the only pattern that satisfies both halves of our requirement (default Auto + per-message force):

| State | Label | Behaviour |
| --- | --- | --- |
| **Default** | `Web: Auto` | Tool registered, system decides. Chip is subtle, muted, always visible. |
| **Forced** | `Web: On` | System prompt instructs: *"The user has explicitly requested web search. Call webSearch before answering."* Chip goes solid/primary. |
| **Off** | `Web: Off` | Tool removed from the registry for this message. Chip shows struck-through globe. |
| **Used** | `Read 5 sources` | Replaces the toggle in place once the search returns, so the bar does not jump. |

Forced state should be **one message only** and auto-revert, so the toggle never becomes a hidden global setting. Put the Sources control in the **footer rail next to the model/effort area**, not inside the `+` menu — a state the user is supposed to understand cannot be two taps deep.

### 4.3 User-facing skills and custom instructions

**Claude Skills.** Per the [Claude composer teardown](https://aiuxplayground.com/teardowns/claude/composer): the `+` menu has a **Skills** flyout with **skill-creator**, **Manage skills** and **Add skill**, and *"Flyout keeps the parent `+` menu open. You do not lose context exploring one level deeper."* Its own critique: *"No preview of which skill is active before send."* **Add armed-state feedback in the composer.**

**ChatGPT memory and custom instructions.** From the release notes: *"just start a new chat and tell ChatGPT anything you'd like it to remember."* And: *"If you have shared that you are vegan and live in San Francisco, ChatGPT may search for 'good vegan restaurants San Francisco'."* The lesson is that personalisation is applied to **tool routing**, not just tone.

**What we should not build.** We are a 1–3 year student in Buea studying Computer Science at the University of Buea, not a power user authoring Markdown skills. A skills marketplace is a distraction. We already have the far stronger version: the **onboarding wizard** (`app/(onboarding)/onboarding/page.tsx`) captures level, multi-select programmes, exam date, confidence and study plan, and `computeReadiness()` injects all of it into the chat system prompt as `STUDENT PROFILE` (`route.ts:294-305`).

Surface it as **one line the student can see and correct**, in their own words:

> 📍 **Computer Science · University of Buea** — Dec 14 in 96 days · weakest: Data Structures
> `Not my course` →

That is the high-value version of "skills". It teaches the student what the tutor knows about them, which is the trust mechanism that a `+` menu full of agent vocabulary destroys.

---

## 5. Speed

### 5.1 Published numbers and thresholds

From [tianpan.co — Time-to-First-Token Is the Latency SLO You Aren't Instrumenting](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models):

- **Perception:** *"responses under one second feel instant, one to three seconds feel fast, and anything past three seconds feels slow. Drop-off on customer support bots rises roughly seven to ten percent per additional second of waiting."*
- **Two phases:** the waiting phase (blank screen, dominated by TTFT) and the reading phase. *"If tokens arrive faster than reading speed — roughly 250 words per minute, or ~5 tokens per second for English prose — the user does not notice inter-token latency at all."* **So after first token, throughput is irrelevant to felt speed.** Optimise TTFT only.
- **Non-reasoning baseline:** *"a non-reasoning model would have first-token in 400 ms."* Reasoning tiers: *"regularly show TTFT of 10 to 150 seconds"* — and crucially this is *"decode time disguised as TTFT."*
- **Prompt caching:** *"caching the system prompt can cut TTFT by up to 80% at long context lengths."* More granularly: *"Prompt caching can cut TTFT 7% at 1k tokens and 67% at 150k tokens."*
- **The honest measurement layer:** *"Measure from the user's client, or at least from your edge terminator, not from your inference server. Network, streaming framing, and SSE keep-alive overhead can add **50–300 ms** that your GPU metrics will never see."*
- **Per-surface SLOs:** *"A code completion popup might have 100 ms. A chat assistant might have 500 ms. A deep research sidebar that users launch and walk away from might have 30 seconds."*
- **Rendering during the wait is the cheapest fix:** *"show the thought summary in a collapsible panel that opens by default on the first request and collapses on subsequent turns… the anthropomorphic 'thinking…' affordance buys you ten seconds of patience that a blank screen does not."*
- **Never stream raw thinking:** *"Do not render raw thinking tokens if the provider exposes only summaries — the temptation to show the unfiltered stream is strong and consistently backfires when the model's chain of thought contradicts its final answer."*

From [Cerebras](https://www.cerebras.ai/glossary/what-is-time-to-first-token): *"A system that begins responding quickly feels more alive and predictable. A system that waits too long before streaming output can feel stalled, even if the final answer is strong."* And a warning that directly applies to us: *"A long prompt with retrieval context, previous conversation, code files, or tool outputs may require more prompt processing before the first token appears."*

Supporting ranges: streaming typically yields first tokens in **50–150 ms** on a warm path ([ezaiapi](https://ezaiapi.com/blog/ai-streaming-sse-python)).

### 5.2 The technique list, ranked by our impact

| # | Technique | Source | Our action |
| --- | --- | --- | --- |
| 1 | **Remove the pre-stream round trip** | TTFT = everything before the first visible byte | **Remove the blocking `generateTitle()` call** in `route.ts:235-248`. Fire it *after* the stream is returned (`onFinish` already does async work) or make it a fire-and-forget Inngest job. Today every new chat pays one extra full model round trip before a single token can stream. **This is our single biggest win.** |
| 2 | **Cache the system prompt** | *"cut TTFT 7% at 1k and 67% at 150k tokens"* | Our system prompt is built fresh per request and embeds a live `STUDENT PROFILE` + `NEXT_PUBLIC_APP_URL` (`route.ts:311-351`). Hoist the **static 90% into a module-level constant** so provider prompt caching can hit it. |
| 3 | **SSE keep-alive before the first token** | [LiteLLM #36154](https://github.com/berriai/litellm/issues/36154): *"OpenAI-shaped streams send zero bytes until the first model token — ingresses and load balancers kill those silent connections at their idle timeout"* | Emit a comment/heartbeat frame immediately after headers so Camtel/MTN middleboxes and any edge proxy do not kill the request during a slow prefill. Directly relevant on Cameroonian mobile networks. |
| 4 | **Show something immediately** | *"buys you ten seconds of patience that a blank screen does not"* | Our `"TiC is thinking…"` only renders when the last message isn't an assistant (`chat-message-list.tsx:327-333`). Render the activity line **always**, from submit, before any part arrives. |
| 5 | **Stream the activity line progressively** | v0, Claude | Replace the static shimmer with a real line per part state: `Checking your notes` → `Read 3 notes` → `Searching the web` → `Read 5 sources` → answer. |
| 6 | **Optimistic user message** | standard | Render the user bubble locally on submit; do not wait for the POST round trip. |
| 7 | **No skeleton for the thread** | M3: *"under 200ms: display the content immediately"*; NN/g: skeletons/spinners unnecessary under 1 second | Our `chat-thread.tsx:217-223` shows a full-height `Loader2` spinner for the whole page while paginated history loads. **Wrong instrument** — that is a skeleton-screen case, and NN/g warns skeletons are for *"full-page loads"* while spinners are for *"a single module."* Prefer instant cached history + inline bottom-loading. |
| 8 | **Per-surface SLO, declared** | *"A chat assistant might have 500 ms"* | Write down **TTFT ≤ 800 ms p95 from the edge** for a new chat, and alert on breach. |

### 5.3 What "almost immediately" should mean for us

Given ~1.63 USD/GB, the binding constraint is not only perceived latency — it is **bytes**. Every re-render of a shimmer gradient is data. A 2-second shimmer loop on a low-end Android at 1.63 USD/GB is a real cost. Design for **one static line that changes text, not an animated component that repaints.** Keep `Shimmer` for the sub-second "connecting" state only, and prefer a plain text swap for everything longer than ~1.5s.

---

## 6. File and image attachments

### 6.1 Exact interactions, per product

**ChatGPT**
- Attach lives in the `+` menu. Inline thumbnail with dismiss: *"You see what ships and can fix mistakes without resetting the thread."*
- **Long-press the `+` button** to open recent photos directly — *"Attach recent photos faster."* ([release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes))
- Dedicated camera with a **Scan** mode: *"open the camera in ChatGPT, tap the three-dot menu, and select **Scan**."*
- Paste over 10k chars → auto-convert to attachment, with *"Show in text field"* to reverse.
- The dictation button **stays available** after adding text or attachments.
- Editing a message with attachments is supported, so a student can revise the prompt without re-attaching.

**Claude** (via [weloveclaude's feature reference](https://www.weloveclaude.com/features/chat-composer-files), sourced from [support.claude.com](https://support.claude.com/en/articles/8241126/upload-files-to-claude))
- Entry point: `+` → **Add files or photos**, or **⌘U**, or drag-and-drop, or clipboard paste.
- Formats: PDF, DOCX, CSV, TXT, HTML, ODT, RTF, EPUB, JSON, plus JPEG/PNG/GIF/WebP.
- Limits: **500 MB per file, 20 files per chat, images to 8000×8000, PDFs to 1000 pages.** (Raised from 30 MB on 2026-09-13.)
- PDFs ≤100 pages are read for **text and visuals**; 101–1000 pages text only.
- Layout: image sits **inside the composer card above the prompt**. Its own critique: *"Images render as inline preview, not filename chips with type and size. Harder to scan when you attach multiple files."*

**Perplexity**
- *"File card inside the bar with thumbnail, name, and size. Clear pre-send preview."* Dismiss per card; mode chips stay visible below the attachment.

**NotebookLM**
- No upload flow at all in the chat — you add sources first, then chat is grounded in them. Suggested questions are generated from those sources.

**Upload UX baseline** ([Eleken, Feb 2026](https://www.eleken.co/blog-posts/file-upload-ui)): dropzone, click-to-upload fallback, instant visual feedback, previews, validation cues (type/size), multi-file support, friendly errors, mobile support. *"File uploads are high-stakes moments. Adding a photo, a document, or a video is the part of the interface where things actually become real."*

**Chip lifecycle to design against** ([context chip management](https://aiuxplayground.com/pattern/context-chip-management)): Empty → Adding → **Chipped** (named chip + type cue + remove) → Editing → **Blocked** (chip still uploading or failed — *"Send stays disabled or warns so incomplete context is not silent"*) → Sent (*"History should reflect what was attached, not a hidden bag"*). Overflow *"collapses with a count when the row gets long."*

### 6.2 Our current bugs, precisely

| Reported symptom | Root cause in code |
| --- | --- |
| **Opens a link instead of a preview** | `chat-message-list.tsx:170-210` renders every attachment as `<a href target="_blank">`. Images get an `<img>` inside an anchor — there is no click-to-zoom lightbox. `AttachmentHoverCard` exists in `attachments.tsx:372-408` and is **used nowhere**. |
| **Wrong count** | `SourcesTrigger count={sourceParts.length}` counts only `source-url`/`source-document` parts. There is no attachment count anywhere, and no `+N` overflow chip in `attachments.tsx`. The composer's `PromptInputAttachments` renders every item — no truncation. |
| **Resize handle we do not want** | `PromptInputTextarea` is an unstyled `<textarea>`; `resize` is not set to `none` and no auto-grow exists. |

Two more things in `chat-composer.tsx` that will bite on a phone:

- The whole composer is **`disabled` during upload** (`:206-213`) with placeholder `"Uploading files..."`. On a 2 Mbps Camtel connection a 3 MB photo takes ~15 seconds of dead composer.
- Upload progress is a **single global bar** for all files (`uploadProgress` is one number), rendered per item but driven by one value — so with 4 files attached every card shows the same percentage.

### 6.3 The interaction to build

1. **A visible paperclip on the bar**, always present, not behind `+`. Long-press it → recent photos (ChatGPT's pattern, and the right one for shared phones with a full gallery).
2. **Camera as a peer, not a submenu.** Open the system camera directly. Gauth's *"take a photo of your problem"* is the category-defining verb.
3. **One scrollable strip above the text field.** 64×64 thumbnails for images, filename + human size for documents. Per-item × at the top-right corner, at least 32×32 for a shared-phone thumb.
4. **Overflow as a count chip.** `+3` beyond what fits, tapping expands the strip. Never silently drop items.
5. **Per-item progress**, per-item retry on failure, and a clear failed state that **blocks send** until resolved (per the "Blocked" chip state).
6. **Click to preview**, never `target="_blank"`. Images → full-screen lightbox with pinch-zoom. Documents → in-app preview sheet.
7. **Never disable the composer during upload.** Let the student keep typing while the photo uploads; that is how you get the question written before the upload finishes.
8. **Documents auto-convert to a text attachment** above ~10k characters, with a "Show in text field" escape hatch (ChatGPT's exact pattern).
9. **Cap and compress.** Client-side downscale to ~1568px long edge before upload. Claude's ceiling is 500 MB/file and 20 files; ours should be far lower. At 1.63 USD/GB, an unoptimised 8 MB phone photo is ~0.013 USD per send and will be sent repeatedly during a study session.

---

## 7. What to steal and what to avoid

### Steal — name the product for each

1. **Collapsed-by-default activity block, above the answer, with a live timer that resolves to "Thought for Ns."** — *Claude*. Copy `support.claude.com`'s exact two bullets: a "Thinking" indicator with a timer, and an expandable section above the response. Northbase confirms none of the four majors expand by default.
2. **Humanised, present-tense, echoing the user's own words.** — *ChatGPT* ("Searching for tech news today"), *Perplexity* ("Searching the web", "Reviewing sources · 10"). Kill `getToolTitle()` and its "Get User Notes" output.
3. **A three-state Sources picker defaulting to Auto.** — *ChatGPT*. Exact answer to our requirement.
4. **Web search on by default with no chip to discover.** — *Claude*. Then add our own bar-level armed state, fixing Perplexity's self-identified flaw ("Easy to forget what is connected").
5. **Stop-generation as a square button, never disabled-while-streaming.** — *all 12 systems in Northbase's survey*. Our `PromptInputSubmit` already draws it.
6. **Inline dictation: waveform + confirm + cancel, replacing the text field.** — *ChatGPT* (inline) and *Claude* (transcribe with confirm). We own the component; it is dead code.
7. **Tapping a suggestion fills the composer rather than sending it.** — *aiuxplayground prompt-starters pattern*, matching ChatGPT's shipped behaviour.
8. **3–4 short starter labels on a fresh chat only, 2×2 cards on mobile, camera-first.** — *ChatGPT + Gauth + Photomath*.
9. **Long-press attach for recent photos; dedicated camera entry.** — *ChatGPT*.
10. **Auto-convert oversized pastes to attachments, with a "Show in text field" reversal.** — *ChatGPT*.
11. **Remove `generateTitle()` from the critical path; cache the static system prompt; emit an SSE heartbeat before first token.** — *tianpan* + *LiteLLM*.
12. **An inline, visible, editable one-line profile.** — *ChatGPT memory*, applied to our existing `STUDENT PROFILE` injection. This is our "skills" feature.
13. **Max ~6 lines of auto-grow, then internal scroll; `resize: none`.** — all four, plus M3's wait-time thresholds for everything around it.

### Avoid — name the product for each

1. **Raw JSON `Parameters` / `Result` blocks and wrench-and-badge tool cards.** — this is *nobody's* pattern; it is ours. Every major collapses it.
2. **A permanently shimmering "Thinking…" with no duration.** — our bug. Gemini's users filed a support thread when "Show thinking" went missing; the indicator is load-bearing.
3. **Streaming raw chain-of-thought to students.** — *tianpan* explicitly: it *"consistently backfires when the model's chain of thought contradicts its final answer."* Anthropic's own faithfulness caveat says the trace does not reliably represent what is happening. Show a summary.
4. **A `+` menu with a dozen rows of equal weight.** — *Claude*, per its own teardown: *"Organizing well is not the same as feeling light."* Our `+` has one item in it. Either add the 3 things that matter (Sources, Attach, Voice) and delete the menu, or keep the menu empty of jargon.
5. **"Show thinking" appearing conditionally.** — *Gemini*, and its users' support thread.
6. **Agent vocabulary in a student app.** — *Claude's* documented mistake: *"Skills, connectors, and plugins sit beside attach rows with equal visual weight. Agent vocabulary in the composer may confuse casual chat users."* No skills marketplace.
7. **A full-page spinner while chat history loads.** — NN/g: skeletons are for full-page loads, spinners for a single module; neither is needed under 1 second.
8. **A full-screen skeleton on first paint.** — NN/g: a frame-only skeleton *"is essentially equivalent to a spinner"* and *"if users are forced to wait for too long, they will assume the page isn't working because the screen is mostly blank."*
9. **Perplexity's tall multi-step stack above the answer.** — great for a research product where the answer is far down; wrong here, where a 1.63 USD/GB phone pays for every re-render and the answer gets pushed below the fold.
10. **A disabled composer during upload.** — our bug, and expensive at this data price.
11. **Anything that treats Enter as send on mobile.** — three separate public complaint threads with 229+ co-signers. Our code is already correct; protect it.
12. **A model picker on the bar.** — *ChatGPT* and *Claude* both have moved it into the composer, and Claude's teardown flags the failure mode of a bare model name: *"Low, Medium, High in the effort menu sound like quality grades."* Students in Buea do not have a model preference. Hide it.

---

## 8. Recommendations

Ordered. Each is implementable against the current codebase.

### P0 — the raw tool trace (the stated core problem)

1. Delete `getToolTitle()` and `ToolInput`/`ToolOutput` from the default path in `chat-message-list.tsx:56-62, 120-153`.
2. Introduce a single `ActivityBlock` component fed by the parts array, rendering **one line per step, humanised, in order, collapsed when done**. Map every tool in `lib/ai/tools.ts` to fixed copy:

| Tool | In-flight label | Completed label |
| --- | --- | --- |
| `webSearch` | `Searching the web for "<query>"` | `Read N sources` |
| `getUserNotes` | `Checking your notes` | `N notes in your library` |
| `searchNotes` | `Searching your notes` | `Found N notes` |
| `getNoteContext` | `Opening "<title>"` | `Read "<title>"` |
| `getUserQuizzes` | `Checking your quizzes` | `N quizzes found` |
| `getQuizContext` | `Opening "<title>"` | `Read "<title>"` |
| `getQuizAttemptHistory` | `Reading your attempts` | `Read N attempts` |
| `getStudyProgress` | `Checking your progress` | `Progress updated` |
| `getSubscriptionContext` | `Checking your plan` | `Plan checked` |
| `createQuiz` | `Building your quiz` | `Quiz ready` |
| `searchKnowledge` | `Looking this up` | `Done` |

3. Render the block **above** the answer text, not after the sources (current order at `chat-message-list.tsx:255-285` is wrong).
4. Default **collapsed when all steps are `output-available`**; expanded only while in flight. Add a live timer while in flight; on completion replace with `Thought for Ns`.
5. `output-error`: render the friendly fallback line (reuse the logic already in `summarizeToolPart`, `chat-message-list.tsx:64-118`) and put raw `errorText` behind a closed "Technical details" disclosure.
6. Delete the hardcoded `duration={0}` at `chat-message-list.tsx:270-275` — it is what pins the label to a permanent shimmer.

### P1 — composer

7. `PromptInputTextarea`: add `resize-none`, auto-grow via `scrollHeight` up to ~120px, then internal scroll. Set `enterKeyHint="send"` only on desktop pointers.
8. Un-disable the submit while streaming; pass `status` through so `PromptInputSubmit` renders the `SquareIcon` stop button. Wire it to `stop()` from `useChat`.
9. Stop disabling the composer during upload; show upload state in the attachment strip only.
10. Per-file upload progress instead of the single global number (`chat-composer.tsx:74, 82-84, 138, 196-199`).
11. Wire `SpeechInput` into the composer footer with waveform + confirm + cancel.
12. Persist the draft per conversation in `sessionStorage`, reusing the key pattern in `pending-message.ts:10-12`.

### P2 — speed

13. Move `generateTitle()` off the critical path (`route.ts:235-248` → into `onFinish`).
14. Hoist the static system prompt to a module constant; keep only the profile block dynamic.
15. Emit an SSE heartbeat before the first token.
16. Render the activity line from submit, unconditionally — remove the `role !== "assistant"` condition at `chat-message-list.tsx:328`.
17. Replace the full-page `Loader2` at `chat-thread.tsx:217-223` with cached instant history + inline footer loading.
18. Declare and instrument a TTFT SLO (target ≤800 ms p95 from the edge) with per-model, per-input-length-bucket histograms, per tianpan.

### P3 — attachments, sources, starters

19. Attachment strip above the text field: 64px thumbnails, per-item remove, `+N` overflow, per-item progress, click-to-preview lightbox. Replace the `<a target="_blank">` rendering at `chat-message-list.tsx:170-210`.
20. Replace the `+` menu with a visible paperclip (long-press → recent photos) plus a camera button.
21. Add the three-state Sources control: `Web: Auto` / `On` / `Off`, persisted per conversation, forced state scoped to one message.
22. Rework the new-chat landing: 4 cards in a 2×2 grid, camera-first, using the copy in §3.3, with at least one starter personalised from `computeReadiness()`.
23. Remove `CHAT_SUGGESTIONS` from the thread footer (`chat-thread.tsx:148-156`) — suggestions belong on the empty state only.

---

## Sources

All fetched 2026-10-12. Raw captures in `.firecrawl/`.

**OpenAI**
- GPT-5/GPT-6 in ChatGPT — thinking levels, Intelligent UI — https://help.openai.com/en/articles/11909943-gpt-5-in-chatgpt
- Searching the web with ChatGPT — Auto/Search picker, `/` shortcut — https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt
- ChatGPT release notes — prompt examples at new chat, 10k paste→attachment, camera Scan, long-press photos, composer suggestions, Thinking in tools menu — https://help.openai.com/en/articles/6825453-chatgpt-release-notes
- Community: missing thinking-time UI regression — https://community.openai.com/t/gpt-5-6-sol-high-intermittent-reasoning-collapse-missing-thinking-time-ui-and-possible-temporary-chat-state-regression/1394404
- Community: newline / Cmd+Enter request — https://community.openai.com/t/chatgpt-app-allow-toggle-newlines-and-cmd-ctrl-return-enter-for-submission/1253379
- App Store reviews — https://apps.apple.com/us/app/chatgpt/id6448311069?see-all=reviews
- Trustpilot reviews (slow-response complaints) — https://www.trustpilot.com/review/chatgpt.com
- r/ChatGPTPro: "becoming more unusable by the day" (slow responses) — https://www.reddit.com/r/ChatGPTPro/comments/1klggsb/is_it_just_me_or_is_chatgpt_becoming_more/

**Anthropic**
- Change the model, effort, and thinking settings — exact on-screen copy — https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings
- Claude's extended thinking — faithfulness, downsides, encryption message — https://www.anthropic.com/research/visible-extended-thinking
- Extended thinking (API) — budgets, interleaved thinking, summarized blocks — https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Upload files to Claude — formats and limits — https://support.claude.com/en/articles/8241126-upload-files-to-claude
- Feature reference: composer files — https://www.weloveclaude.com/features/chat-composer-files

**Google**
- 6 tips to get the most out of Gemini Deep Research — "Show thinking" / "Sites browsed" — https://blog.google/products-and-platforms/products/gemini/tips-how-to-use-deep-research/
- About Gemini models — "Show thinking steps" — https://support.google.com/gemini/answer/18648722
- Support thread: "Thinking Mode not appearing for specific prompts" — https://support.google.com/gemini/thread/407220675
- r/GeminiAI: "Show Thinking" removal backlash — https://www.reddit.com/r/GeminiAI/comments/1rhg687/gemini_31_pro_downgrade_why_show_thinking_was/
- NotebookLM — https://notebook.google.com/
- NotebookLM guide (DataCamp) — suggested questions, ephemeral chat — https://www.datacamp.com/tutorial/notebooklm

**Cross-product teardowns**
- AI output patterns, 233 instances across 12 systems (northbase) — https://www.northbase.design/patterns/ai-output
- Composer comparison — https://aiuxplayground.com/teardowns/compare/design-the-composer
- ChatGPT composer — https://aiuxplayground.com/teardowns/chatgpt/composer
- Claude composer — https://aiuxplayground.com/teardowns/claude/composer
- Perplexity composer — https://aiuxplayground.com/teardowns/perplexity/composer
- Gemini composer — https://aiuxplayground.com/teardowns/gemini/composer
- Prompt starters pattern — https://aiuxplayground.com/pattern/prompt-starters
- Tool switching pattern — https://aiuxplayground.com/pattern/tool-switching
- Context chip management — https://aiuxplayground.com/pattern/context-chip-management

**Performance**
- TTFT as the latency SLO (tianpan) — thresholds, prompt caching, SLO design — https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models
- What is time to first token (Cerebras) — https://www.cerebras.ai/glossary/what-is-time-to-first-token
- LiteLLM #36154 — SSE keepalive before first token — https://github.com/berriai/litellm/issues/36154
- Reduce AI API latency: 7 techniques — https://ezaiapi.com/blog/reduce-ai-api-latency
- SSE streaming, 50–150 ms first token — https://ezaiapi.com/blog/ai-streaming-sse-python

**Loading, upload, keyboard**
- Material 3 progress indicators — wait-time thresholds — https://m3.material.io/components/progress-indicators/guidelines
- NN/g Skeleton Screens 101 — https://www.nngroup.com/articles/skeleton-screens/
- Pencil — Loading Feedback pattern analysis — https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback
- Eleken — Designing a Modern File Upload UI (Feb 2026) — https://www.eleken.co/blog-posts/file-upload-ui
- r/ChatGPTcomplaints — Android Enter sends instead of newline — https://www.reddit.com/r/ChatGPTcomplaints/comments/1rsvwsy/android_app_line_break_key_now_sends_message/
- Google support — Enter as send button (229 co-signers) — https://support.google.com/websearch/thread/470201406

**Competitors in-market**
- Gauth (Google Play) — photo-a-problem flow — https://play.google.com/store/apps/details?id=com.binogi
- Photomath — scan-and-solve positioning — https://photomath.app/
- eStudyUniverse — Cameroon GCE/concours app — https://estudyuniverse.com/

**Our codebase (read, not modified)**
`components/chat/{chat-composer,chat-thread,chat-message-list,chat-sidebar,chat-landing,chat-usage-card,constants,pending-message}.tsx|ts`, `hooks/useChat.ts`, `app/api/ai/chat/route.ts`, `lib/ai/tools.ts`, `components/ai-elements/{reasoning,tool,shimmer,chain-of-thought,suggestion,attachments,prompt-input,speech-input}.tsx`, `node_modules/ai/dist/index.d.ts` (tool part states).