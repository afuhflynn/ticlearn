# Perceived speed, before and after

The numbers below come from `scripts/measure-perceived-speed.ts`, the same
script run twice against a production build of the same machine. The network
is throttled to a phone connection (1.6 Mbit down, 750 Kbit up, 150 ms
latency) and the CPU is throttled to a quarter of its speed.

The raw numbers are in `perceived-speed-before.json` and
`perceived-speed-after.json`.

| Page | LCP before | LCP after | Change | CLS before | CLS after |
|---|---|---|---|---|---|
| `/` | 1076 ms | 668 ms | 38 percent faster | 0 | 0 |
| `/pricing` | 652 ms | 340 ms | 48 percent faster | 0 | 0 |
| `/faq` | 304 ms | 316 ms | flat, within the noise | 0 | 0 |

## Why the numbers moved

The public pages used to ship no content in their document. The nuqs adapter
sat in the root layout, and the adapter reads the search params, and a read
of the search params makes the whole client tree above it render on the
client. The `Suspense` boundary in the root layout then deferred the whole
document, so the student saw a blank page until the JavaScript arrived and
the prerender bought nothing.

Moving the adapter and the boundary down into the route group layouts means
the marketing group has neither, so its pages render their content into the
document. The student reads the pricing table before any JavaScript runs.

The layout shift stayed at zero on every page. That is the number the
skeletons exist to protect, and it is the reason the skeletons mirror the
real layout instead of being a generic block.

## What this bounds and what it does not

This is a build machine and a simulated network. It is not a real phone on a
real network in Buea, and it does not measure the student's experience.

The run covers the three public pages, because those are the ones a stranger
sees and the ones that can be measured without a signed in session. The
authed surfaces, where a student waits on their own data, are not covered.
The honest statement about those is that this feature changes what a student
sees while they wait, not how long they wait. Spec 0010 owns the latency
and spec 0012 owns the first paint, and this one owns the narration of the
wait that remains.
