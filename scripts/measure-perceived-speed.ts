import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

/**
 * The throttled phone run (spec 0013, AC-24).
 *
 * The same script runs before and after the change, so the two sets of
 * numbers are comparable. It records the largest contentful paint and the
 * responsiveness numbers on a phone connection, and writes them to
 * `docs/performance/` so they can be pasted into the pull request.
 *
 * This bounds the improvement. It runs on a build machine and a simulated
 * network, which is not a real phone on a real network.
 *
 * Usage:
 *   npx tsx scripts/measure-perceived-speed.ts --label before
 *   npx tsx scripts/measure-perceived-speed.ts --label after
 */

const LABEL = readArg("--label") ?? "run";
const BASE_URL = readArg("--base-url") ?? "http://localhost:3000";
const PAGES = (readArg("--pages") ?? "/,/pricing,/faq").split(",");
const OUT_DIR = path.resolve(process.cwd(), "docs", "performance");

/** A phone on a slow mobile network, the connection our students use. */
const PHONE = {
  ...devices["Pixel 7"],
};

const THROTTLE = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

interface Measurement {
  page: string;
  largestContentfulPaintMs: number | null;
  firstContentfulPaintMs: number | null;
  timeToInteractiveMs: number | null;
  interactionToNextPaintMs: number | null;
  cumulativeLayoutShift: number | null;
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

/**
 * The observers are installed before the document is parsed, so the largest
 * contentful paint and the interaction latency are captured even though they
 * are only reported through the buffered entries.
 */
const OBSERVERS = `
window.__perf = { lcp: null, inp: null, cls: 0 };
try {
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last) window.__perf.lcp = last.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
} catch (e) {}
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const duration = entry.duration || 0;
      if (duration > (window.__perf.inp || 0)) window.__perf.inp = duration;
    }
  }).observe({ type: "event", buffered: true, durationThreshold: 0 });
} catch (e) {}
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__perf.cls += entry.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
} catch (e) {}
`;

async function measure(
  page: import("@playwright/test").Page,
  url: string,
): Promise<Omit<Measurement, "page">> {
  await page.goto(url, { waitUntil: "load" });
  // Give the page a moment to settle, so the layout shift number is real.
  await page.waitForTimeout(3_000);

  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const perf = (
      window as unknown as {
        __perf: { lcp: number | null; inp: number | null; cls: number };
      }
    ).__perf;

    return {
      largestContentfulPaintMs: perf.lcp === null ? null : Math.round(perf.lcp),
      firstContentfulPaintMs: fcp ? Math.round(fcp.startTime) : null,
      timeToInteractiveMs: navigation
        ? Math.round(navigation.domInteractive)
        : null,
      interactionToNextPaintMs: perf.inp === null ? null : Math.round(perf.inp),
      cumulativeLayoutShift: Number(perf.cls.toFixed(4)),
    };
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...PHONE,
    baseURL: BASE_URL,
  });
  const page = await context.newPage();
  await page.addInitScript(OBSERVERS);

  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: THROTTLE.latency,
    downloadThroughput: THROTTLE.downloadThroughput,
    uploadThroughput: THROTTLE.uploadThroughput,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const results: Measurement[] = [];
  for (const route of PAGES) {
    const url = route.startsWith("http") ? route : `${BASE_URL}${route}`;
    const measurement = await measure(page, url);
    results.push({ page: route, ...measurement });
  }

  await browser.close();

  const stamp = new Date().toISOString();
  const report = { label: LABEL, stamp, results };
  const outFile = path.join(OUT_DIR, `perceived-speed-${LABEL}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nPerceived speed, ${LABEL}, phone connection, 4x CPU throttle`);
  console.log(
    "page".padEnd(20),
    "LCP".padStart(8),
    "FCP".padStart(8),
    "CLS".padStart(8),
  );
  for (const result of results) {
    console.log(
      result.page.padEnd(20),
      `${result.largestContentfulPaintMs ?? "-"}ms`.padStart(8),
      `${result.firstContentfulPaintMs ?? "-"}ms`.padStart(8),
      `${result.cumulativeLayoutShift ?? "-"}`.padStart(8),
    );
  }
  console.log(`\nWritten to ${outFile}`);
  console.log(
    "This bounds the improvement. It is a build machine and a simulated network, not a real phone on a real network.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
