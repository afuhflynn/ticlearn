# Tutor

Slice 2, the chat. The interface is already close to what we want and is being underused: only nine of thirty two installed AI Elements are imported, and the thinking and tool blocks are wired but rendering badly. This slice fixes the experience and puts web search behind a control the student owns.

NOTE: We actually are suggesting to use  vercel blob db for handling image uploads in the chat to make things faster. and I don't know if this has been documented along the way
(basis: research/chat-experience.md · research/web-search-tooling.md)

## Slice 2: The tutor

### 18. Chat interface rebuild · needs a decision · GA
Students currently see raw tool call traces, which reads as broken. Every serious product collapses that activity into a labelled line above the answer that expands on tap. The composer has no auto grow, the send button is disabled mid stream so the stop control is unreachable, an attachment opens a link instead of a preview, the attachment count is wrong, and there is a resize handle nobody asked for. ChatGPT is the reference for this.
**Done when:** an in progress answer shows one collapsed activity line above it with human phrasing such as "Searching the web" and "Read 5 sources", tapping it expands the detail, the composer grows to a maximum height then scrolls, Enter sends and Shift Enter newlines, the stop control is reachable while streaming, an attachment previews on tap and removes individually with an accurate count, and a new chat shows three or four tappable suggestions that fill the composer rather than send.
- [ ] Design it (spec): `/solution-architect chat interface rebuild`

(basis: research/chat-experience.md §1 and §2 · six of twelve surveyed systems use action specific labels and none ship raw JSON, so the vocabulary is copied rather than invented; also, three separate public complaint threads show Enter sending instead of newlining on mobile is a real problem)

### 19. Web search tooling · needs a decision · GA
The agent has one search provider today. Make Firecrawl the primary and Tavily the fallback, behind one tool the model sees, so the model never has to reason about which provider is up. Research measured the sharp edges: Firecrawl's default highlights setting returns pages instead of snippets, it has no Cameroon proxy, Tavily's raw content is uncapped and will flood the context, and Firecrawl is up to ten times cheaper per call.
**Done when:** one tool with one normalised output shape, Firecrawl tried first, Tavily used only when Firecrawl errors or returns nothing usable, an empty result gets one more Firecrawl attempt in a different mode before falling back, results are deduplicated and capped before reaching the model, and we can measure which provider actually served each answer.
- [ ] Design it (spec): `/solution-architect web search tooling`

(basis: research/web-search-tooling.md §4 and §5 · fall back on not useful rather than only on errors, because an empty result is a mode problem while an error is a provider problem)

### 20. Tool controls and course skills · needs a decision
Students need to see and steer what the agent can do. Research found ChatGPT's three state sources picker, Auto, Search, Off, with Auto as the default, is the only documented pattern that gives the student a switch while leaving the decision to the system. On top of that, a student should be able to tell the agent about their course and their faculty once, and have that shape every answer.
**Done when:** the composer carries a sources control with Auto, Search and Off, Auto is the default, the chosen state applies to the next message, a chosen course and faculty reach the system prompt without the student retyping them, and the student can correct or clear them in one place.
- [ ] Design it (spec): `/solution-architect tool controls and course skills`

(basis: research/chat-experience.md §4 and §14 · we take the three state picker from ChatGPT and skip the skills marketplace vocabulary, which teardowns show confuses casual users, in favour of one visible correctable line)
