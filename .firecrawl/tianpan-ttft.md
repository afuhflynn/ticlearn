[Skip to main content](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models#main)

Ask AI

Pull the last week of production traces and look at your latency dashboard. You almost certainly have p50 and p99 on total request latency. You probably have token throughput. You may even have a tokens-per-second chart, because a provider benchmark talked you into it. What you almost certainly do not have is a per-model, per-route, per-tenant histogram of **time to first token** — the single number that governs how fast your product feels.

This is not a small oversight. For any streaming interface — chat, code completion, agent sidebars, voice — perceived speed is set by how long the user stares at a blinking cursor before anything appears. Once the first token lands, the user is reading; subsequent tokens compete with their reading speed, not with their patience. Total latency matters for throughput planning and budget. TTFT matters for whether the product feels alive.

The gap between these two numbers is widening. Reasoning models can produce identical total latency to their non-reasoning siblings while pushing TTFT from 400 ms to 30 seconds. A routing change that "keeps latency flat" can silently turn a snappy assistant into a hanging window. If you are not graphing TTFT, you are shipping UX regressions you cannot see.

## Why Total Latency Hides the UX You Actually Ship [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#why-total-latency-hides-the-ux-you-actually-ship "Direct link to Why Total Latency Hides the UX You Actually Ship")

Total latency is the time from request to last token. It is the right metric for batch jobs, for cost models, and for anything the user is not watching. For streaming interfaces, it is a composite of two phenomenologically different experiences glued together.

The first phase is waiting. The user has hit send, the spinner is spinning, nothing is happening. Every second in this phase feels long. Research on chat interfaces has converged on a rough rule: responses under one second feel instant, one to three seconds feel fast, and anything past three seconds feels slow. Drop-off on customer support bots rises roughly seven to ten percent per additional second of waiting. This phase is dominated by TTFT.

The second phase is reading. Tokens are streaming in, the user's eyes are moving, cognitive load is shared between the model's output speed and the user's input speed. If tokens arrive faster than reading speed — roughly 250 words per minute, or ~5 tokens per second for English prose — the user does not notice inter-token latency at all. Token throughput in this phase competes with the user, not with an empty screen.

p99 total latency blurs these two phases. A 12-second response with 200 ms TTFT and fast streaming feels completely different from a 12-second response with 11 seconds of silence followed by a burst at the end. Your dashboard cannot tell them apart. Your users can.

## The Reasoning-Model Time Bomb [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#the-reasoning-model-time-bomb "Direct link to The Reasoning-Model Time Bomb")

Conventional LLMs spend TTFT almost entirely on prefill — processing input tokens and computing the KV cache. Prefill is predictable: longer prompts take proportionally longer, and caching the system prompt can cut TTFT by up to 80% at long context lengths. Engineers have decent intuitions here.

Reasoning models break the intuition. Before producing a single user-visible token, the model generates an internal chain of thought that may run hundreds to tens of thousands of tokens. From the user's perspective this is indistinguishable from prefill — the screen is blank, the cursor is blinking — but from an infrastructure perspective, it is _decode time disguised as TTFT_. Current reasoning tiers regularly show TTFT of 10 to 150 seconds on problems where a non-reasoning model would have first-token in 400 ms.

This creates a routing landmine. A heuristic like "route hard queries to the reasoning tier, easy ones to the fast tier" optimizes for accuracy and total latency. It silently blows up TTFT. If your product has any path that streams — and most do — moving 20% of traffic to a reasoning model can keep your p99 total latency dashboard flat while destroying the felt responsiveness of your app.

A second, quieter failure: reasoning-model APIs typically expose a _thought summary_ but not raw thinking tokens. If your UI does not render something during the thinking phase, you are asking users to wait in the dark for the most expensive, slowest portion of the request. Whatever your dashboard shows, your users experience this as "the model got broken."

## The TTFT Baselines Every Production Team Should Capture [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#the-ttft-baselines-every-production-team-should-capture "Direct link to The TTFT Baselines Every Production Team Should Capture")

Before you can set an SLO, you need baselines. The measurements below are the minimum set that lets you reason about streaming UX.

- **Per-model TTFT histogram.** p50, p95, p99 TTFT for every model you route to, segmented by input length bucket (e.g., 0–2k, 2k–10k, 10k–50k, 50k+ tokens). A single median is not enough because prefill is linear in input length and the tails are driven by cold cache misses.
- **Cache hit rate and TTFT on hit vs. miss.** Prompt caching can cut TTFT 7% at 1k tokens and 67% at 150k tokens. If you are not tracking cache hits separately, your TTFT distribution is bimodal and nothing you do to optimize the "slow" mode will show up until you separate them.
- **Reasoning-phase duration as a distinct metric.** For reasoning models, measure time-to-first-reasoning-token (TTFRT) and time-to-first-answer-token (TTFAT) separately. The first is user-facing only if you render thinking; the second is what actually appears in the chat bubble.
- **TTFT by tenant and by route.** Long system prompts, large retrieval contexts, and tool-heavy prompts each push TTFT up. Aggregated dashboards wash this out. A per-route histogram tells you which product surface is degrading.
- **TTFT at the edge, not at the model.** Measure from the user's client, or at least from your edge terminator, not from your inference server. Network, streaming framing, and SSE keep-alive overhead can add 50–300 ms that your GPU metrics will never see.

If you already log total latency and token counts, adding TTFT is a single span attribute per request. The friction is almost always political, not technical: nobody owns the SLO, so nobody captures the number.

## UX Scaffolds That Mask TTFT Without Lying to the User [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#ux-scaffolds-that-mask-ttft-without-lying-to-the-user "Direct link to UX Scaffolds That Mask TTFT Without Lying to the User")

Once you are measuring TTFT, you can attack it from two directions: reduce it, or mask it. Masking is underused, because engineers instinctively prefer the "real" fix. Masking is almost always cheaper and is often the right answer, especially for reasoning models where TTFT is intrinsic.

**Optimistic outlining.** As soon as the request leaves the client, render a placeholder structure that matches the expected output shape: headers, a bullet skeleton, a code block frame. This gives the user something to parse while prefill runs. The rule is that the placeholder must be structurally honest — if you render three bullets and the model returns five, you have trained the user to distrust the outline. Use placeholders only at the granularity the request commits to.

**Placeholder streaming.** Send an immediate "typing…" or a single-word acknowledgement from your application layer, _before_ the model responds. This is not a hack; it is the same affordance as a typing indicator on Slack, and it resets the user's waiting clock without deceiving them about content. The trick is to keep the acknowledgement short enough that the model's real tokens can overwrite it without feeling stuttered.

**Rendered thinking.** For reasoning models, show the thought summary in a collapsible panel that opens by default on the first request and collapses on subsequent turns. The research on user perception of AI systems converges on the same point: the anthropomorphic "thinking…" affordance buys you ten seconds of patience that a blank screen does not. Do not render raw thinking tokens if the provider exposes only summaries — the temptation to show the unfiltered stream is strong and consistently backfires when the model's chain of thought contradicts its final answer.

**Skeleton-to-content continuity.** When the real token stream starts, it should flow into the skeleton without a visible reflow. Reflow at first-token is the single most jarring micro-UX failure in modern chat products. If your skeleton is a gray rectangle and your tokens land in a different font at a different width, the user's eye treats first-token as a page load, not a continuation.

Each of these scaffolds is a product decision masquerading as engineering work. They require the UI team and the infra team to agree on a contract — what commits from server to client, and when — that most orgs never formalize.

## Routing Policies That Treat TTFT as a Hard Constraint [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#routing-policies-that-treat-ttft-as-a-hard-constraint "Direct link to Routing Policies That Treat TTFT as a Hard Constraint")

The standard LLM routing decision is framed as a quality/cost tradeoff: for each query, pick the cheapest model that meets the quality bar. This is a two-dimensional optimization over a three-dimensional problem. The third axis is TTFT, and when it is missing, routing systems will happily hand out user-facing queries to reasoning tiers because the accuracy lift looked good in eval.

The fix is to treat TTFT as a hard constraint, not a soft objective. Concretely:

- **Per-surface SLO.** Define a TTFT budget for each product surface. A code completion popup might have 100 ms. A chat assistant might have 500 ms. A deep research sidebar that users launch and walk away from might have 30 seconds. A router that does not know the surface cannot honor the constraint.
- **Pre-commit estimate.** Before routing, estimate TTFT for the candidate model given input length, cache warm state, and (for reasoning tiers) the expected thinking-token budget. Route fails if the estimate exceeds the surface SLO. The estimate can be cheap — a lookup table keyed on model and input bucket is usually within 20% of observed p95.
- **Fallback tier, not quality tier.** If the reasoning tier would breach the TTFT SLO, fall back to the non-reasoning tier with a degraded-answer affordance, rather than holding the user hostage. "We gave you a fast answer; tap here for the deep answer" keeps the surface responsive and the expensive path optional.
- **Asynchronous escape hatch.** For surfaces where the deep answer genuinely matters, offer an async path: dispatch to the reasoning tier, return a run ID, notify on completion. This is the inbox pattern for agent UX, and it is the right home for requests whose natural TTFT exceeds the surface SLO. Do not pretend a 30-second TTFT is a chat response.
- **Post-hoc calibration.** Routers drift. Cache rates shift, model versions change, traffic mix evolves. Close the loop: for every route decision, log the predicted TTFT, the observed TTFT, and the SLO; alert when the predicted-vs-observed delta exceeds a threshold. A router without feedback is a router that will eventually start lying.

Under this framing, "which model is cheapest" becomes the tiebreaker _after_ the TTFT feasibility check, not the driver of the whole decision. This inverts the way most LLMOps platforms present the tradeoff, and it is the only framing that survives contact with reasoning models.

## What to Do Monday Morning [​](https://tianpan.co/blog/2026/04/23/ttft-latency-slo-streaming-reasoning-models\#what-to-do-monday-morning "Direct link to What to Do Monday Morning")

You do not have to boil the ocean. Three moves put you ahead of most teams:

1. Add TTFT as a logged span attribute on every inference call, segmented by model and input-length bucket. One week of data will tell you more about your product's felt performance than your total-latency dashboards have told you all year.
2. Pick the one product surface with the highest streaming traffic. Set an explicit TTFT SLO for it, written down where product and infra both have to look at it. Treat breaches as incidents.
3. For any surface that routes to a reasoning model, build the rendered-thinking affordance or the async-escape-hatch before you ship the routing change. Shipping them in the other order is how you get a quiet UX regression that nobody notices until engagement drops two weeks later.

Token economics and model quality get the attention in LLMOps postmortems because they are easy to measure and easy to discuss. TTFT sits in the blind spot between infra metrics and product metrics, and that blind spot is where most user-visible latency regressions live. Close it, and you will find that half of what you thought were "the model got worse" reports were actually "we changed how long the screen stays blank." The first number to graph is the one you do not have yet.

## References

- [https://benchlm.ai/llm-speed](https://benchlm.ai/llm-speed)
- [https://bentoml.com/llm/inference-optimization/llm-inference-metrics](https://bentoml.com/llm/inference-optimization/llm-inference-metrics)
- [https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html)
- [https://aimultiple.com/llm-latency-benchmark](https://aimultiple.com/llm-latency-benchmark)
- [https://docs.anyscale.com/llm/serving/benchmarking/metrics](https://docs.anyscale.com/llm/serving/benchmarking/metrics)
- [https://deepinfra.com/blog/llm-api-provider-performance-kpis-101](https://deepinfra.com/blog/llm-api-provider-performance-kpis-101)
- [https://www.clarifai.com/blog/ttft-vs-throughput](https://www.clarifai.com/blog/ttft-vs-throughput)
- [https://redis.io/blog/how-to-improve-llm-ux-speed-latency-and-caching/](https://redis.io/blog/how-to-improve-llm-ux-speed-latency-and-caching/)
- [https://skylarbpayne.com/posts/ai-latency/](https://skylarbpayne.com/posts/ai-latency/)
- [https://developers.openai.com/api/docs/guides/reasoning](https://developers.openai.com/api/docs/guides/reasoning)
- [https://firebase.google.com/docs/ai-logic/thinking](https://firebase.google.com/docs/ai-logic/thinking)
- [https://developers.openai.com/cookbook/examples/prompt\_caching\_201](https://developers.openai.com/cookbook/examples/prompt_caching_201)
- [https://llm-d.ai/blog/kvcache-wins-you-can-see](https://llm-d.ai/blog/kvcache-wins-you-can-see)
- [https://sankalp.bearblog.dev/how-prompt-caching-works/](https://sankalp.bearblog.dev/how-prompt-caching-works/)

Let's stay in touch and follow me for more

[Twitter](https://tianpan.co/x) [LinkedIn](https://tianpan.co/linkedin) [Telegram](https://tianpan.co/tg) [Discord](https://tianpan.co/dc) [小红书](https://tianpan.co/xiaohongshu)

## Related articles

[9 min read\\
\\
**Where You Defined 'First Token' Decided Whether Your Latency SLO Was Real** \\
\\
p99 first-token under 800 ms looks like a promise — until a reasoning-tier swap quietly redefines what 'first token' means. The SLO measures the provider…\\
\\
insider\\
\\
llm-ops](https://tianpan.co/blog/2026/06/02/where-you-defined-first-token-decided-whether-your-latency-slo-was-real) [9 min read\\
\\
**The Voice Agent SLO Defined in Time-to-First-Audio Your Provider Measured in Time-to-First-Token** \\
\\
A voice-agent latency SLO built on the LLM's time-to-first-token looks green while users hear a 600 ms gap. The SLO lives at the wrong layer; the user's ear is…\\
\\
insider\\
\\
voice-ai](https://tianpan.co/blog/2026/06/02/the-voice-agent-slo-defined-in-time-to-first-audio-your-provider-measured-in-time-to-first-token) [8 min read\\
\\
**Diurnal Latency: Why Your AI Feature Is Slowest at 9am ET** \\
\\
Frontier model latency follows a daily curve set by other people's traffic. Hour-of-day cohorting, batch routing, and load-aware failover turn a phantom…\\
\\
insider\\
\\
llm-ops](https://tianpan.co/blog/2026/05/09/diurnal-latency-ai-feature-slowest-9am-et) [10 min read\\
\\
**The Eval-Rig Latency Lie: Why Your p95 Doubles in Production** \\
\\
Eval suites measure a quiet machine running serial calls against warm caches; production is a different system. Treat latency as a property of a deployment,…\\
\\
llm-ops\\
\\
evaluation](https://tianpan.co/blog/2026/04/27/eval-rig-latency-lie-warm-cache-benchmark) [10 min read\\
\\
**Inter-Token Jitter: The Streaming UX Failure Your p95 Dashboards Can't See** \\
\\
Time-to-first-token and total completion time both pass SLO while users complain the AI 'froze' mid-response. The metric your dashboard hides is the gap…\\
\\
ai-engineering\\
\\
streaming](https://tianpan.co/blog/2026/04/27/inter-token-jitter-streaming-ux-blind-spot)

[Back to All Posts](https://tianpan.co/blog)