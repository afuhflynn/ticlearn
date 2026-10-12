[![AI UX Playground](https://aiuxplayground.com/images/logo-wordmark-new.svg)](https://aiuxplayground.com/) [Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

[Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

## Overview

How might we let people assemble and edit the exact context bundle before send without guessing what the model will see?

### When to use

- ChatGPT, Claude, Cursor, and Notion-style composers where files, photos, code, or docs become turn context.
- Queries that mix several sources and need an audit of what is included before send.
- Products with a + or attach menu that can add more than one item to the same turn.
- Flows where removing a source mid-compose must be as easy as adding one.

### When to skip

- Single-file upload tools where a chip list is heavier than one attachment row.
- Products that inject hidden RAG context users cannot remove.
- Voice-first surfaces with no visual chip area, use spoken confirmation instead.

## States

Design add → chip → edit → send, not only a paperclip icon.

1. 01


### Empty



No context chips yet. Attach lives in the composer (+ menu or equivalent) with clear source types.

2. 02


### Adding



The person picks a source type and chooses a file or item. Upload or resolve may still be in progress.

3. 03


### Chipped



Each source appears as a named chip with type cue and remove. Multiple chips stack in a scannable row.

4. 04


### Editing



Remove or replace chips before send. Overflow collapses with a count when the row gets long.

5. 05


### Blocked



A chip is still uploading or failed. Send stays disabled or warns so incomplete context is not silent.

6. 06


### Sent



The turn goes with the visible chip set. History should reflect what was attached, not a hidden bag.


## Key UX elements

The parts that must be present for multi-source context to stay inspectable.

Add

Offer a single menu for source types.

A + control opens files, photos, code, or drive in one place so people do not hunt three attach entry points.

Chip

Name each source with a type cue.

Filename or title plus an icon beats a generic “1 attachment” so identity stays verifiable.

q3-roadmap.pdf

Remove

Make discard first-class on every chip.

An X (or equivalent) clears that source without resetting the whole composer.

q3-roadmap.pdf

Row

Keep all active chips visible before send.

The chip row is the audit of what the model will receive. Hide nothing critical behind overflow alone.

q3-roadmap.pdfpricing-table.png

Gate

Block send on incomplete uploads.

Progress and per-chip errors should prevent a turn that claims sources that never finished.

brief.pdf · reading…

Send stays off until the file finishes.

Overflow

Collapse only when the row cannot scan.

A +N count with expand is fine; never drop removable access to an included source.

## Rules

- Chips with no remove (X) or overflow that hides active context.

- Duplicate menus (+, slash, drag-drop) that add the same source twice silently.

- Chips that rename files so users cannot verify identity.

- Sending before chips finish uploading with no disabled send state.


## Evidence

| Product | Implementation |
| --- | --- |
| ChatGPT | \+ menu for files and tools; removable chips above the input. |
| Cursor | @ and attach flows that surface files/context as editable references. |
| Claude | Attach and project files represented before the turn is sent. |
| Notion AI | Page and database context selectable for a generation request. |

## Real-world examples

[See all](https://aiuxplayground.com/teardowns)

- [![](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/attachments.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/chatgpt/logo.svg)ChatGPTChatGPT composer UX: input bar, tools & voice designDesign the composer](https://aiuxplayground.com/teardowns/chatgpt/composer)
- [![](https://media.aiuxplayground.com/images/gallery/claude/context-chips/attachments.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/claude/logo.svg)ClaudeClaude composer UX: model picker, skills & attachmentsDesign the composer](https://aiuxplayground.com/teardowns/claude/composer)
- [![](https://media.aiuxplayground.com/images/gallery/deepseek/tool-switching/file-attachment.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/deepseek/logo.svg)DeepSeekDeepSeek composer UX: DeepThink, Search & modesDesign the composer](https://aiuxplayground.com/teardowns/deepseek/composer)
- [![](https://media.aiuxplayground.com/images/gallery/gemini/multimodal/attachments.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/gemini/logo.svg)GeminiGemini composer UX: tools, Drive & thinking modesDesign the composer](https://aiuxplayground.com/teardowns/gemini/composer)

## FAQ

What is context chip management?

It is the composer pattern that adds multiple context sources through a menu and displays each as a removable chip so users can audit and edit context before send.

How does it differ from context mentions?

Mentions (@file) are typed references in the prompt. Chips are structured attachments outside the prose. Many products use both for the same underlying sources.

Should chips show upload progress?

Yes. Disable or warn on send until uploads complete, and show errors per chip so a failed file does not silently drop from the turn.

How many chips are too many?

When users cannot scan names. Cap visibly, collapse overflow with a count, and prefer project-level context for large corpora instead of dozens of one-off chips.

## Related patterns

- [Tool Switching in ComposerSwitch between AI capabilities within composer](https://aiuxplayground.com/pattern/tool-switching)
- [Input Mode ToggleSwitch between text, voice, and dictation modes](https://aiuxplayground.com/pattern/input-mode-toggle)
- [Follow-up ChipsSuggested next turns](https://aiuxplayground.com/pattern/follow-up-chips)