# AI Output & Delivery

How should AI responses appear on screen? What controls belong in an action bar? When should you show thinking indicators? We analyzed 233 AI output instances across ChatGPT, Claude, Gemini, Perplexity, Copilot, GitHub Copilot, v0, Notion AI, Google Docs, Airtable, Retool, and Atlassian Rovo. Key findings: no standalone system shows AI avatars (but 2 integrated systems do), 100% let users stop generation mid-response, and split-view layouts are standard for code generation (71%) but rare for chat.

All (22)Message Layout (2)Loading States (4)Text Formatting (1)Citations & Sources (3)Split-View & Canvas (3)Action Bars (2)Stop Generation (2)Feedback (1)Follow-ups (2)Refinement & Versions (2)

Message Layout

## 0 of 6 standalone AI chats show an avatar next to responses

Every standalone chat system in the study skips the AI avatar entirely. ChatGPT, Claude, Gemini, Perplexity, Microsoft Copilot, and v0 all rely on left-aligned text positioning to distinguish AI responses from user messages. Only 2 of 12 systems show any avatar: GitHub Copilot uses a gray robot icon, and Retool AI uses a purple 'Hi' circle — both integrated tools where multiple AI personalities coexist in the same interface.

![Claude response showing left-aligned text with collapsible Thought process section, bold headers, and 4-icon action bar with Copy, thumbs up, thumbs down, and regenerate](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fclaude%2Fclaude-ai-input-and-context-0803.webp&w=3840&q=75)Claude. Avatar-free response layout. Left-aligned text with thinking section, bold headers, and compact action bar.

Skip the AI avatar for standalone chat products. Use left-aligned text for AI and right-aligned bubbles for users. Add avatars only when multiple AI personas share the same interface and need visual differentiation.

Message Layout

## 83% of integrated systems use a right sidebar for AI responses

Five of 6 integrated systems place AI responses in a dedicated right sidebar panel. Notion AI, Google Docs AI, Airtable, Atlassian Rovo, and Retool AI all preserve the primary workspace on the left while the AI conversation happens alongside it. No system uses a left sidebar for AI responses, since the left is universally reserved for navigation.

![Notion AI sidebar panel on the right showing a conversation response with Copy, Add to page, thumbs up, and thumbs down buttons](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fnotion%2Fnotion-ai-input-and-context-3403.webp&w=3840&q=75)Notion AI. Right sidebar preserves the document on the left. Action bar includes Copy and Add to page for content integration.

Place AI assistance in a right sidebar when building document or workspace integrations. Keep the primary content area visible so users can reference their work while reading AI output.

Loading States

## 50% of systems use minimal loading: dots, spinners, or branded animations

Six of 12 systems use simple animated indicators for loading. ChatGPT shows a single pulsing black dot, Claude uses an orange sunburst matching its logo, and Gemini renders animated skeleton lines. Google Docs AI displays 'Just a sec...' with skeleton bars. These minimal indicators work because fast operations (under 5 seconds) do not benefit from detailed status text.

![Claude loading state showing orange sunburst animation with 'Reply...' placeholder in input field and stop button](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fclaude%2Fclaude-ai-input-and-context-0802.webp&w=3840&q=75)Claude. Branded orange sunburst animation during loading. No text status needed for fast operations.

Use a minimal branded indicator for simple Q&A responses. Reserve detailed status text for multi-step operations where users need to understand why generation is taking longer.

Loading States

## 6 of 12 systems describe what AI is doing, not just 'Thinking'

Half the systems in the study use action-specific status text during generation. ChatGPT shows 'Searching for tech news today', Perplexity displays 'Reviewing sources . 10', and Airtable renders 'Building tables' in branded magenta text. This approach builds trust by explaining delays and shows users the AI is actively working, not stuck.

![Perplexity showing multi-step loading with 'Working...' status, 'Searching the web' step, and 'Reviewing sources . 10' with source list populating](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fperplexity%2Fperplexity-ai-input-and-context-2102.webp&w=3840&q=75)Perplexity. Multi-step loading shows search query, source count, and processing stages in sequence.

Show action-specific status text when AI uses tools, searches the web, or performs multi-step tasks. Match the loading label to the actual operation rather than using a generic 'Thinking' for every request.

Loading States

## 4 of 12 systems expose AI reasoning, always collapsed by default

Claude, Gemini, v0, and Retool AI all show visible thinking traces, but none expand them by default. Claude uses a collapsible 'Thought process' section with a beige background. v0 streams real-time reasoning text and adds a 'Worked for 30s' duration badge. Retool shows numbered step progress with expandable wireframe and technical spec sections.

![v0 showing real-time thinking stream 'The user wants to increase the rounded corners by 4px. I need to read the globals.css file to see the current' with 'Working' indicator](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fv0%2Fv0-ai-input-and-context-4909.webp&w=3840&q=75)v0. Real-time thinking text visible during generation. Duration badge and toast notification track progress.

Collapse thinking traces by default and let users expand on demand. Most users want the answer, not the reasoning. Expanded thinking pushes the actual response below the fold.

Loading States

## How v0 and Retool build trust with generation timestamps

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Text Formatting

## 4 of 12 systems use emoji headers, exclusively for web search results

ChatGPT, Gemini, Microsoft Copilot, and Perplexity use emoji section headers like '💻 Software & Operating Systems' and '📱 Upcoming Product Events'. The remaining 8 systems use bold text only — Claude, GitHub Copilot, Atlassian Rovo, and Retool AI all default to bold headers without emoji. Emoji headers cluster specifically around web search and news results where visual scanning matters, while professional, technical, and enterprise responses stay emoji-free.

![ChatGPT web search response showing emoji section headers like '💻 Software & Operating Systems' and '📱 Upcoming Product Events' with inline citations](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fchat-gpt%2Fchatgpt-ai-input-and-context-0303.webp&w=3840&q=75)ChatGPT. Emoji headers for web search results. Visual categorization helps scan multiple news topics.

Use emoji headers only for browsable, scannable content like news feeds and search results. Default to bold-only headers for technical, professional, or enterprise responses where emoji introduces tonal inconsistency.

Citations & Sources

## 100% of search-enabled systems use inline citations (5 of 5)

Every system that performs web search includes inline citations after factual claims. ChatGPT shows source names in gray text ('Windows Central', 'Reuters'), Claude uses teal linked source names with collapsible favicon lists, and Perplexity displays superscript domain formats ('contentful+1', 'salesforce+1'). The format varies but the pattern is universal: claims from web sources always reference their origin.

![Perplexity response showing superscript citations like 'contentful+1' and 'salesforce+1' inline with 'Reviewed 10 sources' collapsible header and Related section](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fperplexity%2Fperplexity-ai-input-and-context-2103.webp&w=3840&q=75)Perplexity. Superscript citations with source count. Compact format preserves reading flow.

Include inline citations for every web-sourced claim. Use compact formats (superscript numbers or small text) that do not interrupt reading flow. Never omit citations for search results.

Citations & Sources

## How 5 systems surface source panels with favicons and full context

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Citations & Sources

## How Notion AI and Atlassian cite workspace documents differently

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Split-View & Canvas

## 71% of code-capable systems use split-view with live preview

Five of 7 code-capable systems use a split-view layout. ChatGPT Canvas runs approximately 35%/65% chat-to-preview, Claude Artifact uses a 50/50 split, and v0 offers collapsible chat with viewport controls. All include a code/preview toggle. Gemini adds save, undo, and redo controls in its canvas toolbar. The split ratio consistently gives more space to the preview panel.

![Claude Artifact preview mode showing live rendered React component with 'Open Modal' button, code toggle, and JSX language badge](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fclaude%2Fclaude-ai-input-and-context-1003.webp&w=3840&q=75)Claude. Artifact preview mode renders an interactive React component. Toggle switches between code view and live preview.

Use a split-view layout for code generation with the preview panel taking 60-65% of the width. Include a toggle between code view and live preview. Chat can be collapsible for maximum preview space.

Split-View & Canvas

## How Retool builds apps in 10 numbered steps with live canvas

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Split-View & Canvas

## 4 of 4 document editors tint AI content and require explicit Accept

Every document-integrated AI system generates content inline with a distinct visual treatment and requires explicit approval — no system auto-inserts. Notion AI uses a light purple background with Accept and Discard buttons (plus an Escape shortcut). Google Docs AI applies a blue gradient card with a Refine dropdown and Insert button. Atlassian Rovo places content in a light container with an 8-action bar and a confirmation dialog for destructive Discard. The visual tint plus mandatory acceptance protects user trust by never modifying documents without consent.

![Google Docs inline AI card showing generated content with Refine dropdown expanded showing Shorten, Elaborate, More formal, More casual, Bulletise, Summarise, Retry and Insert button](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fgoogle-docs%2Fgoogledocs-ai-input-and-context-3903.webp&w=3840&q=75)Google Docs. Blue gradient card with 7 refinement presets and Insert button. Content is visually distinct from existing document text.

Use a distinct background tint (purple, blue, or light gray) for inline AI-generated content. Always require explicit Accept or Insert before merging AI output into the document. Add keyboard shortcuts (Escape for Discard) and a confirmation dialog for destructive actions.

Action Bars

## 50% of systems use a 4-5 icon compact action bar

Six systems use a compact action bar with 4 to 5 icons. Claude shows Copy, thumbs up, thumbs down, and Regenerate. GitHub Copilot places feedback first, then Copy and Regenerate. Retool uses the most minimal approach with only thumbs up and thumbs down. The compact pattern works because chat users can type follow-up messages for anything beyond these core actions.

![GitHub Copilot response with 5-icon action bar showing thumbs up, thumbs down, copy, regenerate, and more options dropdown](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fgithub%2Fgithub-ai-input-and-context-4501.webp&w=3840&q=75)GitHub Copilot. Feedback-first ordering with 5 icons. Prioritizes quality signals over utility actions.

Start with 4 icons for conversational AI: Copy, thumbs up, thumbs down, and Regenerate. Add Share or More only if your product supports export or additional workflows.

Action Bars

## Research tools need 6-8 action icons including Sources and Export

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Stop Generation

## 83% of systems replace the Send button with Stop during generation

Ten of 12 systems transform the send button into a stop button during AI generation, using a square icon as the universal standard. ChatGPT uses a black square, Claude uses an orange square matching its brand, GitHub Copilot uses red, and v0 adds a visible 'Stop' text label. Only Retool and Atlassian Rovo use separate stop controls instead of replacing the send button.

![GitHub Copilot showing red square stop button in input area with 'Copilot is responding...' placeholder text](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fgithub%2Fgithub-ai-input-and-context-4502.webp&w=3840&q=75)GitHub Copilot. Red stop button replaces send. Input placeholder changes to 'Copilot is responding...' during generation.

Replace the Send button with a square Stop icon during generation. Use your brand color for the stop button background. Add a text label only if your interface has room and your audience includes non-technical users.

Stop Generation

## How Retool offers 'Stop & Prompt' for mid-generation guidance

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Feedback

## 83% of systems use paired thumbs up/down, always adjacent

Ten of 12 systems use paired thumbs up and thumbs down icons for binary feedback. All 10 place them adjacent with no other element between them. Five systems put feedback first in the action bar (Gemini, GitHub, v0, Retool, Airtable), while five put Copy first (ChatGPT, Claude, Microsoft Copilot, Notion, Atlassian). Google Docs shows only thumbs down, and Airtable relies on Undo as implicit feedback.

![Microsoft Copilot action bar showing thumbs up, thumbs down, share, copy, retry, and 'Edit in a page' icons below a code block response](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fmicrosoft-copilot%2Fcopilot-ai-input-and-context-2703.webp&w=3840&q=75)Microsoft Copilot. 6-icon action bar with adjacent thumbs up/down. Feedback icons are never separated across any system.

Use paired thumbs up/down as your feedback mechanism. Place them adjacent in the action bar. Choose feedback-first if you prioritize model training; choose Copy-first if you prioritize user productivity.

Follow-ups

## 75% of systems use conversational follow-ups to continue the interaction

9 of 12 systems embed follow-up questions or suggestions directly in AI responses. ChatGPT asks 'What direction do you want to go next?', Gemini offers 'Would you like me to help you outline a basic design system?', and Retool lists specific modification options like styling and data adjustments. This conversational approach feels natural and requires no additional UI components.

![Retool showing completed dashboard build with Step 10 'Check with user on implementation' and detailed follow-up question listing specific modification options](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fretool%2Fretool-ai-input-and-context-5016.webp&w=3840&q=75)Retool. Detailed follow-up after completed build. Lists specific adjustment options for styling, data, and display.

End AI responses with a specific follow-up question when the topic has clear next steps. Frame questions around concrete options rather than generic 'Is there anything else?'

Follow-ups

## Perplexity uses full Related questions to drive deeper research

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

Refinement & Versions

## 25% of systems offer preset refinement dropdowns for document editing

Three systems provide dropdown menus with preset refinement options. Google Docs AI offers 7 presets: Shorten, Elaborate, More formal, More casual, Bulletise, Summarise, and Retry. Notion AI splits options into Suggested (Improve writing, Proofread) and Edit (Make shorter, Change tone). Atlassian Rovo combines both approaches. No standalone chat system uses preset dropdowns — typing a follow-up message is faster and more flexible than navigating a dropdown with predefined options.

![Notion AI text selection menu showing Suggested section with Improve writing and Proofread, plus Edit section with Make shorter, Change tone, Simplify language, Make longer options](https://www.northbase.design/_next/image?url=%2Fimages%2Fpatterns%2Fai-input-output%2Fnotion%2Fnotion-ai-input-and-context-3204.webp&w=3840&q=75)Notion AI. Categorized refinement menu with Suggested and Edit sections. Sub-menus for tone and language changes.

Add a Refine dropdown for document editors with 5-7 preset options covering length, tone, and format. Skip dropdowns for conversational AI where the chat input is already the refinement mechanism.

Refinement & Versions

## Only 2 of 12 systems offer version history for AI-generated content

Pro

Data, screenshots, and actionable recommendations. Unlock this and every Pro insight.

[See plans →](https://www.northbase.design/pricing)

AI Output Best Practices & Patterns from 12 Enterprise AI Systems \| Northbase