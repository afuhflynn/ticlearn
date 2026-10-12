[![AI UX Playground](https://aiuxplayground.com/images/logo-wordmark-new.svg)](https://aiuxplayground.com/) [Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

[Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

## Calm default

![Empty card with starter pills. Model and effort already visible on the right before you type.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/calm-default.webp)Empty card with starter pills. Model and effort already visible on the right before you type.

### What works

- No tool vocabulary on first load. You can just type.
- Starter pills (Write, Learn, Code, Life stuff, Claude choice) teach common jobs without opening the + menu.
- \+ on the left and model on the right keep behavioral toggles separate from which model answers.
- Sonnet 4.6 and Low effort show before the first keystroke. Price-sensitive users see what they are spending on; everyone sees model tier and upgrade path in one control. [ChatGPT](https://aiuxplayground.com/teardowns/chatgpt/composer) keeps upgrade as a separate upsell with no tie to what you are using now.

### What we would push on

- Starter pills and the + menu are two front doors. Some users may never open + for skills, connectors, or screenshot.
- Mic and waveform sit as plain icons side by side on the right rail. Dictation and voice conversation look the same until you tap. Conversation needs a clearer affordance (blue fill, wave styling).

### Product bet

Anthropic wants newcomers to type on a calm card while power users and teams see model tier and effort before the first keystroke. That transparency sells Pro and Max on quality, not a separate upsell banner.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Model and effort visible on the default card | Spend control and upgrade clarity before first send | Busier first impression than a fully empty bar |

### Takeaway

Calm card, explicit model on the right, depth in +. Visibility on model and effort is a feature, not clutter.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Prompt Starters](https://aiuxplayground.com/pattern/prompt-starters)

## \+ menu

![Attach, screenshot, project, skills, connectors, plugins, web search toggle, and style in one list.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/plus-menu.webp)Attach, screenshot, project, skills, connectors, plugins, web search toggle, and style in one list.

### What works

- One + menu groups attach, agent tooling, and behavioral toggles. You pick intent, not infrastructure.
- Web search defaults on with no chip in the card. You just prompt. Claude skips the "is this a search?" split [ChatGPT](https://aiuxplayground.com/teardowns/chatgpt/composer) forces with a separate mode.
- Keyboard shortcut on attach rewards power users without adding another bar icon.

### What we would push on

- The list got long: screenshot, project, skills, connectors, plugins, style. Organizing well is not the same as feeling light.
- Skills, connectors, and plugins sit beside attach rows with equal visual weight. Agent vocabulary in the composer may confuse casual chat users.

### Product bet

The + menu is how Anthropic grows Claude from chat into an agent workbench: skills, connectors, and plugins, without spinning up separate surfaces for each capability.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| One + menu for attach, search, and agent tooling | Scales capability without bar clutter; web search default on | Long list with equal visual weight; agent rows may confuse casual chat users |

### Takeaway

The + menu scales capability without bar clutter. Web search is the model: default on, no mode chip. The length of the list is the harder problem.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Attachments

![Inline image preview inside the card. Send appears once there is something to ship.](https://media.aiuxplayground.com/images/gallery/claude/context-chips/attachments.webp)Inline image preview inside the card. Send appears once there is something to ship.

### What works

- The image sits inside the composer card above the prompt. You see what Claude will read before send.
- Send affordance appears when content is ready. Clear signal that the message is shippable.

### What we would push on

- Images render as inline preview, not filename chips with type and size. Harder to scan when you attach multiple files.
- Attach still lives inside +, not on the bar. Sending a file is not an edge case.

### Product bet

Keeping multimodal context inside the composer card keeps simple image Q&A in-thread instead of pushing users to Artifacts or projects for every file question.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Inline image preview inside the card | You see what Claude reads before send | Harder to scan multiple files than filename chips |

### Takeaway

Copy keeping multimodal context inside the card. Question preview-only treatment when users stack several attachments.

Pattern: [Context Chip Management](https://aiuxplayground.com/pattern/context-chip-management)

## Skills submenu

![Skills flyout with skill-creator, Manage skills, and Add skill. Parent menu stays open.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/skills-submenu.webp)Skills flyout with skill-creator, Manage skills, and Add skill. Parent menu stays open.

### What works

- Flyout keeps the parent + menu open. You do not lose context exploring one level deeper.
- skill-creator, Manage skills, and Add skill cover discover, edit, and extend without a separate settings page.

### What we would push on

- Skills next to connectors and plugins makes the composer feel like an agent workbench, not a chat box.
- No preview of which skill is active before send.

### Product bet

Skills are Anthropic’s extensibility bet: customize behavior inside chat instead of building custom GPTs or plugin marketplaces as separate products.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Skills flyout inside the + menu | Discover, manage, and extend without a settings page | No in-card armed-state feedback before send |

### Takeaway

Good flyout pattern for overflow. Pair it with in-card feedback when a skill or connector is armed.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Model picker

![Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5, with outcome labels and Effort entry on the right rail.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/model-picker.webp)Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5, with outcome labels and Effort entry on the right rail.

### What works

- Outcome labels per model (everyday, complex, quick) teach the choice in plain language alongside version names.
- Model picker on the right rail stays separate from +. Behavioral toggles do not compete with which brain answers.
- Effort is one tap away from the model row instead of buried in account settings.
- Fable 5 and upgrade gates sit beside workhorse models. Model, price tier, and reason to upgrade in one picker, not a disconnected upsell.

### What we would push on

- The bar shows "Sonnet 4.6" and "Low" side by side. Low reads like low performance, not low effort. Model and effort are different choices and need clearer labels.

### Product bet

Anthropic sells on model quality and transparency. A right-rail picker ties tier, effort, and upgrade path to what you are using now, which is the core Pro conversion story.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Right-rail model picker with outcome labels | Clear brain choice separate from behavioral toggles | Model name plus "Low" shorthand can read like a quality downgrade |

### Takeaway

Right-rail model choice is the right split from +. Explicit model, effort, and upgrade path beats a hidden upsell. Label effort so it does not sound like a downgrade.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

Pattern: [Persona Selector](https://aiuxplayground.com/pattern/persona-selector)

## Effort and thinking

![Low, Medium, High, Max effort levels with plain-language tradeoffs. Thinking toggle beside the list.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/effort-controls.webp)Low, Medium, High, Max effort levels with plain-language tradeoffs. Thinking toggle beside the list.

### What works

- Effort copy explains the tradeoff in human terms: thorough answers vs hitting limits sooner.
- Thinking toggle sits next to effort in the same panel. Related controls stay grouped.

### What we would push on

- Effort and thinking both change how hard the model works. The composer does not spell out when to use which.
- Low, Medium, High in the effort menu sound like quality grades. Spell out "effort" or token use so they do not read as model tiers.

### Product bet

Extended thinking and effort controls justify Pro and Max pricing by letting users tune compute spend per message instead of paying for opaque "smarter" defaults.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Effort and thinking in the right-rail submenu | Plain-language tradeoffs before costly runs | Two "how hard" levers without guidance on when to use which |

### Takeaway

Plain-language effort copy in the submenu is worth copying. Fix the shorthand in the bar so Low never sounds like a weak model.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## More models

![Overflow submenu with Opus 4.7, 4.6, and Opus 3 behind More models.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/more-models.webp)Overflow submenu with Opus 4.7, 4.6, and Opus 3 behind More models.

### What works

- Legacy and alternate Opus versions tuck behind More models. The first screen stays shorter.
- Same flyout pattern as skills: parent menu stays open while you browse.

### What we would push on

- Overflow models show version numbers without the everyday or complex labels from the main picker.

### Product bet

Legacy model access keeps developers and power users on Claude during rollout churn without forcing everyone through a longer default picker.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Overflow submenu for legacy Opus versions | Shorter first screen in the model picker | Overflow models lose the outcome labels from the main list |

### Takeaway

Overflow keeps the first screen short. Match the outcome labels from the main list when you tuck models away.

Pattern: [Tool Switching in Composer](https://aiuxplayground.com/pattern/tool-switching)

## Voice dictation

![Waveform, live transcription in the card, confirm and cancel controls on the right.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/voice-dictation.webp)Waveform, live transcription in the card, confirm and cancel controls on the right.

### What works

- Transcription appears inside the composer card. You can edit before confirm.
- Waveform plus X and check give a clear review step instead of auto-send on silence.

### What we would push on

- Dictation replaces the text area content. Attaching files or toggling web search mid-dictation is unclear.

### Product bet

Dictation with a confirm step lowers accidental-send risk and supports mobile and accessibility users without forcing everyone into a separate voice product up front.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Transcription with confirm inside the composer card | Edit before send; clear review contract | Unclear interaction with attach or search during dictation |

### Takeaway

Copy the confirm step and in-card transcription. Differentiate the two voice entry points before users have to learn by trial.

## Voice listening

![Full listening state with blue glow, Listening label, and Stop control.](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/voice-listening.webp)Full listening state with blue glow, Listening label, and Stop control.

### What works

- Listening state is unmistakable once you are in: blue treatment, label, and a dedicated Stop button.
- Conversation mode feels live. Dictation is transcribe-then-confirm. Different jobs once active.

### What we would push on

- Blue glow only appears after you tap waveform. On the bar, both voice icons still look the same.
- Stop vs cancel vs check: three exit paths across two screens. Document the mental model or simplify.

### Product bet

Full conversation mode targets hands-free sessions like commutes, cooking, and workouts, where dictation-to-text is the wrong job. That drives engagement time Anthropic can monetize on Pro and Max.

### Tradeoff

| Decision | Benefit | Cost |
| --- | --- | --- |
| Separate conversation mode with blue listening treatment | Unmistakable in-session contract vs dictation | Bar icons look identical until tap; split discovery from dictation |

### Takeaway

Conversation mode earns its blue treatment in-session. The entry icons on the bar still need to teach the split upfront.

## How it fits together

### The pattern

- Calm card first, + on the left for attach, search, skills, and agent tooling; model and effort on the right rail.
- Web search on by default with in-menu toggle, no mode chip.
- Flyout submenus keep the parent + menu open (skills, more models).
- Voice adds a review step before send instead of piping audio straight into the thread.

### Where it varies

- Armed-state feedback differs: model and effort show on the rail; skills and style often have no in-card signal before send.
- Voice entry icons look the same until active; Listening state only teaches the split in-session.
- Attach preview works for single images; multiple files are harder to scan than chip lists.
- Effort and thinking are both "how hard" levers without composer guidance on which to use.
- Starter pills and + are parallel discovery paths with no bridge between them.

### Product bet

Claude’s composer is Anthropic’s bet on transparent model choice plus agent extensibility inside one chat shell. The right rail sells Pro and Max on quality; the + menu grows into skills and connectors without fragmenting the product.

### Tradeoffs

| Decision | Benefit | Cost |
| --- | --- | --- |
| Model and effort visible on the default card | Spend control and upgrade clarity before first send | Busier first impression than a fully empty bar |
| One + menu for attach, search, and agent tooling | Scales capability without bar clutter; web search default on | Long list with equal visual weight; agent rows may confuse casual chat users |
| Inline image preview inside the card | You see what Claude reads before send | Harder to scan multiple files than filename chips |
| Skills flyout inside the + menu | Discover, manage, and extend without a settings page | No in-card armed-state feedback before send |
| Right-rail model picker with outcome labels | Clear brain choice separate from behavioral toggles | Model name plus "Low" shorthand can read like a quality downgrade |
| Effort and thinking in the right-rail submenu | Plain-language tradeoffs before costly runs | Two "how hard" levers without guidance on when to use which |
| Overflow submenu for legacy Opus versions | Shorter first screen in the model picker | Overflow models lose the outcome labels from the main list |
| Transcription with confirm inside the composer card | Edit before send; clear review contract | Unclear interaction with attach or search during dictation |
| Separate conversation mode with blue listening treatment | Unmistakable in-session contract vs dictation | Bar icons look identical until tap; split discovery from dictation |

### Takeaway

Claude splits capability well: + for extras, right rail for model brain. Web search shows the right default: on, no mode chip. Copy the structure; fix armed-state feedback and voice entry clarity.

## Takeaways

### Copy this

- Web search default on, in-menu toggle only, no chip splitting prompts into a search mode
- Flyout submenus that keep the parent open (skills, more models)
- Model and effort visible in the composer for spend control and upgrade clarity
- Outcome labels on models and plain-language effort copy
- Voice transcription with confirm before send

### Skip this

- Forcing web search into a separate mode chip when most prompts should just work
- Long + menus with no in-card feedback when skills or style are armed
- Upgrade upsells disconnected from the model the user is on today
- Effort labels that read like model quality when shown beside the model name
- Two voice entry icons that look identical until the user taps
- Inline image preview only when users need multi-file chip scanning

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
Read teardown](https://aiuxplayground.com/teardowns/chatgpt/composer) [![](https://aiuxplayground.com/images/gallery/perplexity/logo.svg)Perplexity\\
\\
Perplexity puts Search and Computer in the bar, with + for uploads and connectors.\\
Read teardown](https://aiuxplayground.com/teardowns/perplexity/composer)

## Frequently asked questions

How is Claude’s composer different from ChatGPT?

Claude surfaces model and effort on the composer before the first send, defaults web search on, and keeps skills and attachments in the + menu so research-ready defaults are visible without a separate search chip.

Why does Claude show effort next to the model?

Effort and model together make spend and latency legible before send, so users know what they are about to run before they commit tokens.

Where do Claude skills live?

Skills sit in a + submenu alongside attach, so power features stay discoverable without turning the default card into a mode picker.