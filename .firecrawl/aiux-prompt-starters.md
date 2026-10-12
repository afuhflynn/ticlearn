[![AI UX Playground](https://aiuxplayground.com/images/logo-wordmark-new.svg)](https://aiuxplayground.com/) [Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

[Newsletter](https://aiuxplayground.substack.com/subscribe) Join 2K+ AI designers and PMs on Substack. New teardowns, patterns, and prompts as they drop.

## Overview

How might we help people start when a blank composer gives no hint of what the assistant can actually do?

### When to use

- General assistants and chat products where new users face a single blank input with no context.
- Multi-purpose tools where the range of useful requests is not obvious from the interface alone.
- ChatGPT, Claude, and Gemini all show concrete starter prompts on a fresh chat.
- Products with several distinct use cases, where naming them beats a generic greeting.

### When to skip

- Returning power users who already have a clear task; static starters become visual clutter after the first session.
- Highly specialized tools where generic starters cannot represent the narrow, expert-level queries the product expects.
- Interfaces where the input itself already has strong placeholder text doing the same job.

## States

Design the first five seconds of a new chat, not only the placeholder copy in the composer.

1. 01


### Empty



A new chat opens with no messages. A headline and a small set of starter options are visible.

2. 02


### Considering



The person scans the starters or ignores them entirely to type a request of their own.

3. 03


### Filled



Tapping a starter drops its prompt into the composer so the person can edit before sending.

4. 04


### Sent



The prompt goes to the assistant as a normal user turn, edited or not.

5. 05


### Answered



The first reply lands. The empty state is gone and a normal thread replaces it.


## Key UX elements

The parts that must be present for starters to earn their place on an empty screen.

Headline

State the assistant purpose in one line.

Name what the assistant is for, not a generic greeting. Skip this row for narrow single-purpose tools.

Starters

Offer 3 to 4 scannable task labels.

Short labels like Plan a trip beat a wall of prefilled constraints. Specifics belong in the thread after send.

Plan a tripWrite an emailExplain a conceptReview an idea

Composer

Keep the input visible below the starters.

Starters supplement the composer. Someone who ignores every option must still be able to type freely.

Message

Fill

Drop a short prompt into the composer, not a long brief.

A simple opener is enough. Clarifying questions in the first reply gather destination, tone, or constraints.

Help me plan a trip.

Dismiss

Let typing replace the starters without friction.

Once the person sends a first message, starters should not resurface and compete with the thread.

## Rules

- The same four starters shown to every user regardless of their role or prior usage.

- Starters that showcase capabilities the product cannot actually deliver well yet.

- No way to dismiss or refresh starters, so they persist as noise once a user is experienced.

- Vague starters like "Ask me anything" that do not model good prompting behavior.


## Evidence

| Product | Implementation |
| --- | --- |
| ChatGPT | Rotating example prompts appear on the empty new-chat screen. |
| Claude | Suggested prompts on first load model different task categories the assistant handles. |
| Notion AI | Empty-state suggestions demonstrate writing, summarizing, and brainstorming actions. |
| Google Gemini | Starter cards on the home screen surface varied use cases at first launch. |

## Real-world examples

[See all](https://aiuxplayground.com/teardowns)

- [![](https://media.aiuxplayground.com/images/gallery/alexa-for-shopping/shopping/welcome.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/alexa-for-shopping/logo.svg)Alexa for shoppingAlexa for shopping: conversation, price alert, and auto buyAI shopping](https://aiuxplayground.com/teardowns/alexa-for-shopping/shopping)
- [![](https://media.aiuxplayground.com/images/gallery/chatgpt/tool-switching/calm-default.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/chatgpt/logo.svg)ChatGPTChatGPT composer UX: input bar, tools & voice designDesign the composer](https://aiuxplayground.com/teardowns/chatgpt/composer)
- [![](https://media.aiuxplayground.com/images/gallery/claude/tool-switching/calm-default.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/claude/logo.svg)ClaudeClaude composer UX: model picker, skills & attachmentsDesign the composer](https://aiuxplayground.com/teardowns/claude/composer)
- [![](https://media.aiuxplayground.com/images/gallery/gemini/tool-switching/calm-default.webp)\\
\\
![](https://aiuxplayground.com/images/gallery/gemini/logo.svg)GeminiGemini composer UX: tools, Drive & thinking modesDesign the composer](https://aiuxplayground.com/teardowns/gemini/composer)

## FAQ

What is the prompt starters pattern in AI chat UX?

Prompt starters are example prompts shown on an empty chat screen before the user types anything, giving concrete suggestions like "Summarize this article" so new users understand the assistant's capabilities without facing a blank input field.

Do prompt starters actually improve first-session engagement?

Yes, they lower the barrier for users unsure how to phrase a request, which is especially valuable for first-time users encountering an open-ended text box with no other guidance.

Should prompt starters change based on the user?

Ideally yes. Personalizing starters by role, past usage, or recency (e.g. "continue where you left off") keeps them useful past the first session instead of becoming static, ignorable chrome.

Can a starter be a complete first job instead of just a prompt line?

Yes. One starter can ship with sample context (a draft email, a short doc, or a constrained task) so the first tap runs end to end and lands a clear result. Use that when blank-input failure is your main drop-off risk.

Are prompt templates and prompt libraries separate patterns?

No. Empty-state starters, reusable templates with slots, and curated libraries are variants of Prompt Starters. Use empty-state cards for first sessions, saved templates for repeat work, and a library when browsing or onboarding needs more than a few suggestions.

## Related patterns

- [Tool Switching in ComposerSwitch between AI capabilities within composer](https://aiuxplayground.com/pattern/tool-switching)
- [Context Chip ManagementAdding context sources via menu with removable chips](https://aiuxplayground.com/pattern/context-chip-management)
- [Input Mode ToggleSwitch between text, voice, and dictation modes](https://aiuxplayground.com/pattern/input-mode-toggle)