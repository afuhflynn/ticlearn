[![AI UX Playground](https://aiuxplayground.com/images/logo-wordmark-new.svg)](https://aiuxplayground.com/) [Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

[Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

## Calm default

![Ask anything bar with Search and Computer chips inside. Model, mic, and voice on the right.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/calm-default.webp)Ask anything bar with Search and Computer chips inside. Model, mic, and voice on the right.

### What works

- Search mode is visible on first load, not buried in a + menu. Scope before send matches the product job.
- Starter pills below the bar teach common jobs (slide deck, business optimize) without opening menus.
- \+ on the left for attach; Search, Computer, and Model stay in the bar as separate controls.

### What we would push on

- Search, Computer, Model, mic, and waveform are five affordances on one bar. Dense for a calm default.
- Mic and waveform sit side by side as plain icons. Voice entry paths look the same until you tap.
- Placeholder says Ask anything while other states say Type @ for connectors. Copy shifts between modes.

### Product bet

Perplexity wins when users know they are in a research product, not generic chat. Surfacing Search on first load teaches the core job without a tour and sets scope before the first ask.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Search chip visible on first load | Research scope is obvious before the first ask | Bar gets dense with Search, Computer, Model, mic, and voice on one row |

### Takeaway

Right call to surface Search in the bar for a research product. Worth simplifying voice entry and keeping placeholder copy consistent.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

## \+ menu

![Upload files, Connectors flyout entry, and Spaces behind + on the left.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/plus-menu.webp)Upload files, Connectors flyout entry, and Spaces behind + on the left.

### What works

- \+ keeps attach and source wiring separate from Search and Computer chips. Inputs versus scope stay split.
- Short first screen: upload, connectors, spaces. Scannable in one glance.
- Placeholder shifts to Type @ for connectors, teaching the @ shortcut when + is open.

### What we would push on

- Connectors and Spaces both hide behind chevrons. Two overflow paths with similar weight.
- Upload still lives inside +, not on the bar. Attaching files is core to research workflows.

### Product bet

Splitting + (inputs) from bar chips (search scope) lets Perplexity grow connectors and Spaces without crowding the mode row that defines the product.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Attach and connectors behind + | Mode chips stay readable in the bar | Upload and source wiring fight the paperclip habit for research workflows |

### Takeaway

Copy splitting + (inputs) from bar chips (search mode). Make connector and space paths easier to tell apart.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Attachments

![File card with thumbnail, filename, and size inside the ask bar.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/attachments.webp)File card with thumbnail, filename, and size inside the ask bar.

### What works

- output.jpg renders as a card inside the bar with thumbnail, name, and size. Clear pre-send preview.
- Dismiss on the card fixes mistakes without clearing the whole query.
- Search and Computer chips stay visible below the attachment. Mode does not reset on upload.

### What we would push on

- Placeholder switches to Type / for search modes when a file is attached. Another copy shift to learn.
- Multiple files may crowd the top band; only a single-file case is shown here.

### Product bet

File uploads are core to research. Inline preview cards reduce attach anxiety and keep users in the ask flow instead of treating files as a separate workflow.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| File card inside the bar | Clear pre-send preview before a costly run | Placeholder and bar density shift with each attachment |

### Takeaway

File card inside the bar is worth copying. Keep placeholder and mode chips stable when context is attached.

Pattern: [Context Chip Management](https://aiuxplayground.com/pattern/context-chip-management)

## Connectors

![Connectors flyout with Web checked, Academic toggle, and cloud import path.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/connectors.webp)Connectors flyout with Web checked, Academic toggle, and cloud import path.

### What works

- Web and Academic as checkboxes teach source scope in plain language.
- Flyout keeps the parent + menu open. Same pattern as other products in this teardown set.
- Upgrade banner at the top of connectors ties paywall to more sources, not a random settings page.

### What we would push on

- Active sources (Web on) do not show as chips in the bar. Easy to forget what is connected.
- Academic sits beside Web with equal weight. No copy on when to pick one versus both.
- Add files from cloud is a third path beside upload and connectors checkboxes.

### Product bet

Source toggles in a flyout let Perplexity upsell Pro at the moment users define research scope, not in a disconnected settings page.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Connectors in flyout, not bar chips | Clean default bar | Easy to forget which sources are armed before send |

### Takeaway

Source toggles in a flyout work for research. Surface armed connectors in the bar the way Search mode already is.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Computer mode

![Computer chip selected. Branding shifts to perplexity computer with Orchestrator on the right.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/computer-mode.webp)Computer chip selected. Branding shifts to perplexity computer with Orchestrator on the right.

### What works

- Computer as a bar chip makes agentic mode a first-class switch, not a buried tool.
- Page title and placeholder change with mode (What should we work on next?). Pre-send contract is clear.
- Orchestrator replaces Model in Computer mode. Label matches the job, not a generic model row.

### What we would push on

- Search and Computer look like equal chips. Nothing signals Computer is a heavier, multi-step run.
- Switching modes changes branding and picker label. Users must learn two composer personalities.

### Product bet

Computer as a bar chip positions agentic multi-step work as a peer product mode, driving Pro adoption for users who outgrow single-shot search.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Computer chip equal weight to Search | Agentic mode feels first-class, not buried | Nothing signals heavier cost or latency before send |

### Takeaway

Bar-level mode chips fit Perplexity. Teach cost and latency differences between Search and Computer before send.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Persona Selector](https://aiuxplayground.com/pattern/persona-selector)

## Orchestrator picker

![Orchestrator menu with GPT-5.5, Claude Opus 4.8, and Claude Sonnet 4.6 behind lock icons.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/computer-models.webp)Orchestrator menu with GPT-5.5, Claude Opus 4.8, and Claude Sonnet 4.6 behind lock icons.

### What works

- Orchestrator name signals multi-model routing, not a single provider pick.
- Provider logos beside each row help scan GPT versus [Claude](https://aiuxplayground.com/teardowns/claude/composer) options quickly.
- Locks show upgrade path inline instead of failing silently after send.

### What we would push on

- Every orchestrator row is locked on the free plan. Menu is mostly an upsell surface.
- No outcome copy (fast, deep, code) beside model names. SKU list without job guidance.

### Product bet

Orchestrator naming sells multi-model routing as a premium capability and frames upgrades as better brains for agent work, not raw provider logos.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Locked orchestrator rows on free | Clear upgrade path before send | Menu reads mostly as paywall preview, not job guidance |

### Takeaway

Orchestrator framing is smarter than a raw model dropdown for agentic mode. Add outcome labels and one free default so the menu is not only locks.

Pattern: [Model Selection UI](https://aiuxplayground.com/pattern/model-selection-ui)

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Model picker

![Search mode Model menu with Sonar, GPT, Gemini, Claude, and Kimi K2.6 New.](https://media.aiuxplayground.com/images/gallery/perplexity/model-selection/model-picker.webp)Search mode Model menu with Sonar, GPT, Gemini, Claude, and Kimi K2.6 New.

### What works

- Multi-provider list in the composer makes Perplexity feel model-agnostic. Pick the brain per query.
- Access the top AI models header ties upgrade to the picker, not a disconnected banner.
- New badge on [Kimi](https://aiuxplayground.com/teardowns/kimi/composer) K2.6 flags one recent add instead of labeling everything new.

### What we would push on

- Most rows are lock icons on free. Similar to Orchestrator: picker as paywall preview.
- GPT-5.4, GPT-5.5 Max, Opus 4.8 Max: version-heavy list without plain-language outcomes.
- Model picker beside Search and Computer chips adds a third dimension before first send.

### Product bet

Multi-provider choice in the composer is Perplexity’s differentiation from single-vendor chat. The picker makes model-agnostic research tangible at ask time.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Model picker on the bar in Search mode | Pick the brain per query, on brand | Third dimension before send; locks dominate on free |

### Takeaway

Meta-model picker is on-brand for Perplexity. Pair it with outcome copy and a clear free default so locks are not the whole story.

Pattern: [Model Selection UI](https://aiuxplayground.com/pattern/model-selection-ui)

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Voice listening

![Listening state inside the ask bar with stop and confirm controls.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/voice-listening.webp)Listening state inside the ask bar with stop and confirm controls.

### What works

- Listening label inside the bar. You stay in the composer instead of jumping away immediately.
- Stop and check give a review step before the query ships.
- Search and Computer chips stay visible during listen. Mode context is not lost.

### What we would push on

- This listening state still competes with the full-screen voice UI. Two voice surfaces to learn.
- Mic versus waveform on the default bar still look identical before you tap either.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Listening state inside the composer | Stay in ask flow; confirm before send | Competes with full-screen voice from the same bar icons |

### Takeaway

In-bar listening with confirm is worth copying. Unify entry icons and clarify when users leave the bar for full-screen voice.

## Voice session

![Full-screen voice with prompt text, shimmering orb, and mic or dismiss controls.](https://media.aiuxplayground.com/images/gallery/perplexity/tool-switching/voice-session.webp)Full-screen voice with prompt text, shimmering orb, and mic or dismiss controls.

### What works

- Full-screen voice is unmistakable. Orb and large canvas signal conversation, not dictation.
- Short assistant prompt sets tone before you speak. Human entry to hands-free mode.

### What we would push on

- Composer listening and full-screen voice are different exits from the same bar icons.
- No visible link back to Search or Computer scope once you are in the orb view.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Separate full-screen voice shell | Unmistakable conversation mode | Split from bar modes; Search and Computer scope disappear in orb view |

### Takeaway

Strong conversation shell. Connect it to the search bar modes so voice does not feel like a separate product.

## How it fits together

### The pattern

- Search and Computer chips in the bar set scope before ask. + handles uploads and connectors; Model handles provider choice.
- File cards and connector flyouts keep inputs visible before send.

### Where it varies

- Search mode is visible on load; connectors arm in a flyout without bar feedback.
- Computer mode renames the picker to Orchestrator and shifts page branding.
- Voice splits between in-bar listening and a full-screen orb from similar bar icons.
- Placeholder copy shifts between Ask anything, Type @, and Type / depending on mode and context.

### Product bet

Perplexity’s composer is built to sell research scope upfront and model choice at ask time. When connectors, mode cost, and voice entry stay hidden, that honesty gap undermines trust in Pro features built on top of the bar.

### Tradeoffs

| Decision | Benefit | Cost |
| --- | --- | --- |
| Search chip visible on first load | Research scope is obvious before the first ask | Bar gets dense with Search, Computer, Model, mic, and voice on one row |
| Attach and connectors behind + | Mode chips stay readable in the bar | Upload and source wiring fight the paperclip habit for research workflows |
| File card inside the bar | Clear pre-send preview before a costly run | Placeholder and bar density shift with each attachment |
| Connectors in flyout, not bar chips | Clean default bar | Easy to forget which sources are armed before send |
| Computer chip equal weight to Search | Agentic mode feels first-class, not buried | Nothing signals heavier cost or latency before send |
| Locked orchestrator rows on free | Clear upgrade path before send | Menu reads mostly as paywall preview, not job guidance |
| Model picker on the bar in Search mode | Pick the brain per query, on brand | Third dimension before send; locks dominate on free |
| Listening state inside the composer | Stay in ask flow; confirm before send | Competes with full-screen voice from the same bar icons |
| Separate full-screen voice shell | Unmistakable conversation mode | Split from bar modes; Search and Computer scope disappear in orb view |

### Takeaway

Perplexity puts research scope in the bar where chat products hide it behind +. The architecture fits. Visibility for connectors, mode differences, and voice entry need the same honesty Search already gets.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching), Bar chips for scope, + for inputs, Model for brain choice is a research-native composer architecture.

Pattern: [Model Selection UI](https://aiuxplayground.com/pattern/model-selection-ui)

## Takeaways

### Copy this

- Search mode as a bar chip on a research-native product
- Split + (uploads, connectors) from mode chips (Search, Computer)
- File preview card with name and size inside the ask bar
- Source toggles (Web, Academic) in a connector flyout
- Orchestrator label for agentic mode instead of a generic model row

### Skip this

- Hiding research scope behind + when mode is the product
- Connector toggles with no in-bar feedback when armed
- Model pickers that are only lock icons on free
- Two voice entry icons that look identical on the bar
- Placeholder copy that changes every time the mode shifts

## How others design the composer

How other products handle the same job, and what each tradeoff reveals.

[Compare composer UX across products\\
\\
ChatGPT, Claude, Perplexity, and Gemini side by side: default bar, tools, cost, and patterns to copy.\\
\\
Full comparison](https://aiuxplayground.com/teardowns/compare/design-the-composer)

[![](https://aiuxplayground.com/images/gallery/chatgpt/logo.svg)ChatGPT\\
\\
ChatGPT puts modes and tools in one + menu on the left, with mode chips inside the bar after selection.\\
Read teardown](https://aiuxplayground.com/teardowns/chatgpt/composer) [![](https://aiuxplayground.com/images/gallery/claude/logo.svg)Claude\\
\\
Claude uses + for attach and agent tools, with model and effort isolated on the right rail.\\
Read teardown](https://aiuxplayground.com/teardowns/claude/composer) [![](https://aiuxplayground.com/images/gallery/gemini/logo.svg)Gemini\\
\\
Gemini nests uploads and tools in one + menu with model and thinking on the right.\\
Read teardown](https://aiuxplayground.com/teardowns/gemini/composer)

## Frequently asked questions

What makes Perplexity’s composer search-first?

Search and Computer mode chips sit inside the ask bar so research depth is the default decision, while uploads and connectors live in the + menu.

How does Perplexity upsell from the composer?

Computer orchestrator rows often show locks on free plans, so the model/orchestrator picker doubles as an upgrade surface at the moment users define research scope.