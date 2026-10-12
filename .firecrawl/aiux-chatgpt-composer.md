[![AI UX Playground](https://aiuxplayground.com/images/logo-wordmark-new.svg)](https://aiuxplayground.com/) [Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

[Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

## Calm default

![Empty bar, no chips. Starter pills already hint at three jobs.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/calm-default.webp)Empty bar, no chips. Starter pills already hint at three jobs.

### What works

- No tool vocabulary on first load. You can just type.
- Starter pills teach three common jobs without opening the + menu.

### What we would push on

- Starter pills and the + menu are two front doors. Some users may never open the + menu.
- Attach and advanced modes need another way in if pills stay the primary path.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Calm default (no chips on load) | Familiar, low intimidation | Advanced tools stay hidden until users discover the + menu or pills |

### Takeaway

Approachable surface, hidden depth. Fine if you accept the discoverability tradeoff.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching), Capability stays off the bar until you ask: progressive disclosure as a growth strategy, not just aesthetics.

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters), Starter pills teach jobs without opening the + menu, but they compete with it as a second front door.

## Tools & modes

![Photos, image, Think, research, and web search on the first screen. More is for overflow.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/tools-modes.webp)Photos, image, Think, research, and web search on the first screen. More is for overflow.

### What works

- One + menu groups attach, creation, and behavioral modes. You pick intent, not infrastructure.
- Open the + menu and the first screen lists attach, Create image, Thinking, Deep research, and Web search. More and Projects hold overflow.

### What we would push on

- Does web search need to be a mode? Most people already ask in plain language ("What is the stock price for SpaceX today?"). A mode earns its place when the output contract changes: citations, live results, slower run, a chip that confirms web use.
- "Look something up" on the starter pill and Web search in the + menu are the same job, two doors.
- Think and Deep research sit side by side with one line each. Different jobs, same visual weight, and the composer only teaches the difference after you pick Deep research.
- Every row looks the same weight. Nothing signals that Deep research takes minutes while Think is a slower single reply.

### Product bet

The + menu is how OpenAI sells heavier modes (Deep research, image gen, web search) inside one chat product instead of spinning up separate apps for each job.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Equal visual weight for every mode row | Consistent menu design | Slow or costly modes look as cheap as fast ones |

### Takeaway

The + menu organizes well. It does not help you choose between modes that look equal but behave very differently.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching), Modes are tools with different output contracts, the menu should signal cost and latency, not just intent.

Pattern: [Persona Selector](https://aiuxplayground.com/pattern/persona-selector), Think and Deep research behave like personas with different runtimes, but share equal visual weight.

## Attachments

![Thumbnail preview with dismiss. Attach is inside the + menu, not on the bar.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/attachments.webp)Thumbnail preview with dismiss. Attach is inside the + menu, not on the bar.

### What works

- Inline thumbnail with dismiss. You see what ships and can fix mistakes without resetting the thread.
- Attach stacks with mode chips without clearing them. Flexible for power users.

### What we would push on

- Attach inside the + menu fights the paperclip habit from email and Slack. Sending a file is not an edge case.
- File + mode chip + custom text makes the composer dense fast.

### Product bet

ChatGPT’s bet is one input for everything (attach, modes, send), so the product can grow into tools and agents without users learning a new surface for each feature.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Attach inside the + menu | Keeps the default bar calm | Fights the paperclip habit; file send is not an edge case |

### Takeaway

Copy the inline preview with dismiss. Question hiding attach behind the + menu unless you have another strong discovery path.

Pattern: [Context Chip Management](https://aiuxplayground.com/pattern/context-chip-management), File and mode chips stack in one bar. Plan for crowding when attach, scope, and output controls all show at once.

## Deep research

![Chip, pre-filled prompt, report starters. This is what a pre-send contract looks like.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/deep-research.webp)Chip, pre-filled prompt, report starters. This is what a pre-send contract looks like.

### What works

- Chip, placeholder ("Get a detailed report"), credible starters below. You know the job before you type.
- Pre-fill teaches prompting without trapping you. Edit, remove chip, still fine.
- Apps and Sites filters scope the research run inside the composer.

### Product bet

Deep research runs take minutes and cost real compute. Teaching the job before send reduces rage-quits, and makes it easier to justify Plus when users know what they signed up for.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Pre-send education for slow modes | Fewer surprise waits and abandoned threads | More UI density before the first send |

### Takeaway

This is the bar for behavioral modes: name the outcome, suggest a first prompt, keep scope in the bar.

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Think mode

![A chip appears. Nothing else changes. No pre-fill, no starters, no hint about what Think actually does.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/think-mode.webp)A chip appears. Nothing else changes. No pre-fill, no starters, no hint about what Think actually does.

### What works

- Removable chip shows scope before send.
- Placeholder stays editable. No locked template.

### What we would push on

- Thinnest mode in the set. Research and Search rewrite placeholder and starters. Think adds a chip. Send looks like default chat.
- Deep research pre-fills "Get a detailed report," adds Apps and Sites, drops report starters. Think stays on "Ask anything." Same output shape, supposedly smarter reasoning. The product gap is real. The UI gap is invisible.
- Can you explain the tradeoff before send? Think fails. Deep research passes.

### Product bet

Think is a retention bet on “smarter default chat.” If users wait longer and cannot tell what changed, they may not come back, especially after paying for Plus.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Think as chip only | Simple to ship and remove | No pre-send contract; user learns after waiting |

### Takeaway

A removable chip works. Label-only is not enough differentiation. Behavioral modes need a pre-send contract.

Pattern: [Persona Selector](https://aiuxplayground.com/pattern/persona-selector), A behavioral mode needs a pre-send contract, chip-only fails when the output shape looks identical to default chat.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Web search

![Search chip, web placeholder, trending starters.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/web-search.webp)Search chip, web placeholder, trending starters.

### What works

- Chip, web-specific placeholder, trending starters. Live web is in scope before send.
- Same rhythm as Deep research. Feels learnable once selected.

### What we would push on

- Did you need to pick a mode at all? Default chat handles "search for X" in plain language for many queries.
- Research and Search overlap for anyone who wants fresh info. The UI does not help you choose.
- "Look something up" on the empty state points at the same job without explaining how it differs from Web search here.

### Product bet

Web search burns retrieval and inference on every run. A dedicated mode makes that cost explicit before send, and gives OpenAI a clear signal when users want live data.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Web search as explicit mode | Clear scope before a costly run | Redundant with plain-language lookup in default chat |

### Takeaway

Execution is solid after selection. The open question is whether search should be a mode or just something you say.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

## Image mode

![Chip in the bar. Edit, style, and Explore ideas open up below.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/image-mode.webp)Chip in the bar. Edit, style, and Explore ideas open up below.

### What works

- Scope in the bar, exploration below. You commit to making an image without inventing a prompt from zero.
- "Explore ideas" helps people who want inspiration, not a template to paste.
- Starters swap when the tool changes. Image prompts do not bleed into Search.

### Product bet

Image gen is a high-value mode that keeps users in ChatGPT instead of Midjourney or DALL·E. Starters and chip scope raise completion without a separate creation app.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Dedicated image mode with starters | Higher completion on generative jobs | Another mode row competing for discovery with research and search |

### Takeaway

One of the clearer modes. Chip plus contextual starters teach the job before send.

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Image controls

![Aspect ratio sits in the bar, only while Image is active.](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/image-aspect-ratio.webp)Aspect ratio sits in the bar, only while Image is active.

### What works

- Aspect ratio inline when Image is active. Message-scoped, not global settings.
- Progressive disclosure. The bar earns density only after you pick a generative mode.

### What we would push on

- Chip, ratio dropdown, and attach preview can stack. Hide controls when the chip goes away.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Inline output controls while Image is active | Fast iteration on the current prompt | Bar crowding when chip, ratio, and attach stack |

### Takeaway

Good pattern for send-time output controls. Watch crowding at the high end.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Context Chip Management](https://aiuxplayground.com/pattern/context-chip-management)

## Voice in the composer

![Dictation replaces the text field. Waveform, cancel, confirm.](https://media.aiuxplayground.com/images/gallery/chatgpt/dictation/voice-input.webp)Dictation replaces the text field. Waveform, cancel, confirm.

### What works

- Mic on the right, + menu on the left. Separate jobs, separate active states.
- Dictation replaces typing instead of stacking on top.
- Waveform plus confirm/cancel gives a clear listening contract.

### What we would push on

- Two voice paths exist: inline dictation and full voice session. The bar mic does not tell you the richer mode exists.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Dictation inline in the composer | Speak once, edit, then send: familiar chat loop | Hides the richer full-session voice product behind the same mic affordance |

### Takeaway

Dictation in the composer is well scoped. The product-level voice map is not.

Pattern: [Input Mode Toggle](https://aiuxplayground.com/pattern/input-mode-toggle)

Pattern: [Voice Visualizer](https://aiuxplayground.com/pattern/voice-visualizer)

## Voice session

![Full-screen voice. Conversation mode, not text replacement.](https://media.aiuxplayground.com/images/gallery/chatgpt/dictation/voice-session.webp)Full-screen voice. Conversation mode, not text replacement.

### What works

- Full viewport fits back-and-forth talk. Different job from speak once, edit, send.
- "Start talking" and a visible End button. Clear exit.

### What we would push on

- Dictation feeds the composer. Session bypasses it. Naming and placement should make that split impossible to miss.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Separate full-screen voice session | Clear back-and-forth talk without text-field constraints | Split discovery from the bar mic; users may never find it |

### Takeaway

Right surface for conversation mode. Wrong that users have to discover it separately from the bar mic.

Pattern: [Input Mode Toggle](https://aiuxplayground.com/pattern/input-mode-toggle)

Pattern: [Voice Visualizer](https://aiuxplayground.com/pattern/voice-visualizer)

## How it fits together

### The pattern

- Calm default, + menu for capability, chip for scope, starters when the mode needs them, send.
- Attach and modes share one + menu. Voice and send stay on the right.

### Where it varies

- Pre-send contracts differ by mode: Research, Search, and Image teach before send; Think adds a chip only.
- Users build different expectations depending on which mode they pick.
- Discovery splits across starter pills and the + menu; attach and voice each offer more than one entry path.

### Product bet

The composer is meant to become ChatGPT’s shell for memory, projects, and agents. Inconsistent mode treatment makes that shell feel unreliable, and hurts trust in paid features built on top of it.

### Tradeoffs

| Decision | Benefit | Cost |
| --- | --- | --- |
| Calm default (no chips on load) | Familiar, low intimidation | Advanced tools stay hidden until users discover the + menu or pills |
| Equal visual weight for every mode row | Consistent menu design | Slow or costly modes look as cheap as fast ones |
| Attach inside the + menu | Keeps the default bar calm | Fights the paperclip habit; file send is not an edge case |
| Pre-send education for slow modes | Fewer surprise waits and abandoned threads | More UI density before the first send |
| Think as chip only | Simple to ship and remove | No pre-send contract; user learns after waiting |
| Web search as explicit mode | Clear scope before a costly run | Redundant with plain-language lookup in default chat |
| Dedicated image mode with starters | Higher completion on generative jobs | Another mode row competing for discovery with research and search |
| Inline output controls while Image is active | Fast iteration on the current prompt | Bar crowding when chip, ratio, and attach stack |
| Dictation inline in the composer | Speak once, edit, then send: familiar chat loop | Hides the richer full-session voice product behind the same mic affordance |
| Separate full-screen voice session | Clear back-and-forth talk without text-field constraints | Split discovery from the bar mic; users may never find it |

### Takeaway

One of the better composer architectures for hiding power without cluttering the bar. Mode quality is uneven. Copy the layered structure, not every mode treatment.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching), Calm default → + menu → chip → send is a reusable composer architecture, mode quality is where products diverge.

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

## Takeaways

### Copy this

- One + menu for attach, tools, and modes
- Removable chips that show scope before send
- Pre-send contract: placeholder and starters that match the mode
- Outcome labels ("Create image," "Deep research") instead of model names
- Inline output controls only while the relevant chip is on

### Skip this

- Modes that are only a chip (Think)
- A dedicated search mode when plain prompts already route to the web
- Starter pills and the + menu as parallel discovery with no bridge between them
- Two voice entry points without explaining dictation vs conversation
- Every menu row looking equally important when some modes are slow or costly

## How others design the composer

How other products handle the same job, and what each tradeoff reveals.

[Compare composer UX across products\\
\\
ChatGPT, Claude, Perplexity, and Gemini side by side: default bar, tools, cost, and patterns to copy.\\
\\
Full comparison](https://aiuxplayground.com/teardowns/compare/design-the-composer)

[![](https://aiuxplayground.com/images/gallery/claude/logo.svg)Claude\\
\\
Claude exposes model choice on the right and keeps search/style in + flyouts, betting that power users want model control over a calm default.\\
Read teardown](https://aiuxplayground.com/teardowns/claude/composer) [![](https://aiuxplayground.com/images/gallery/perplexity/logo.svg)Perplexity\\
\\
Perplexity puts Search and Computer in the bar, search is the product, not a hidden mode behind a + menu.\\
Read teardown](https://aiuxplayground.com/teardowns/perplexity/composer) [![](https://aiuxplayground.com/images/gallery/gemini/logo.svg)Gemini\\
\\
Gemini nests uploads and tools in one + menu but surfaces model and thinking on the right, similar shell, different emphasis on model transparency.\\
Read teardown](https://aiuxplayground.com/teardowns/gemini/composer)

## Frequently asked questions

How does ChatGPT design its composer?

ChatGPT keeps a calm empty messaging bar, then reveals tools, modes, and attachments behind a single + menu with removable chips that show scope before send.

Where do ChatGPT tools and modes live?

Attach, tools, and modes share one + menu. Removable chips confirm what is in scope before the user hits send, instead of crowding the default bar with permanent mode chips.

How does ChatGPT handle model choice?

Menus lean on outcome labels such as Create image or Deep research rather than forcing casual users to pick raw model names up front.