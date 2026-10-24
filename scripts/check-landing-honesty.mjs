#!/usr/bin/env node
import process from "node:process";

/**
 * The honesty rule set for the whole public set, from spec 0016 AC-10. The
 * landing page (spec 0015) plus the five public pages: About, FAQ, contact,
 * Terms and Privacy.
 *
 * Each page is fetched as a reader receives it, the scripts are removed, and
 * what is left is checked for the things a page about this product must never
 * say: an amount of money, a bare percentage, a phone number, an email
 * address, or a surface that was cut. "Progress" and "feedback" are allowed
 * now: Tip reports study progress in chat, and a quiz shows what was missed.
 *
 * The landing page keeps its canonical rule; the five public pages do not,
 * because canonicals and the rest of technical SEO belong to feature 36.
 *
 * The app must be running. `pnpm build && pnpm start` is the honest target;
 * `pnpm dev` works too. Pass a base URL as the first argument or set
 * LANDING_URL.
 *
 *   node scripts/check-landing-honesty.mjs
 *   node scripts/check-landing-honesty.mjs http://localhost:3000
 */

const baseUrl = (
  process.argv[2] ??
  process.env.LANDING_URL ??
  "http://localhost:3000/"
).replace(/\/$/, "");

const PAGES = [
  { path: "/", name: "landing", requireCanonical: true },
  { path: "/about", name: "about", requireCanonical: false },
  { path: "/faq", name: "faq", requireCanonical: false },
  { path: "/contact", name: "contact", requireCanonical: false },
  { path: "/terms", name: "terms", requireCanonical: false },
  { path: "/privacy", name: "privacy", requireCanonical: false },
];

const BANNED_WORDS = [
  { word: "community", why: "community was cut" },
  { word: "leaderboard", why: "the leaderboard was cut" },
  { word: "affiliate", why: "the student affiliate surface was cut" },
  { word: "readiness", why: "the readiness score was cut" },
  { word: "exam", why: "the page sells notes, quizzes and Tip only" },
  { word: "mock", why: "the mock exam family is gone" },
  {
    word: "gce",
    why: "the page addresses university and HND students, not a school exam",
  },
  {
    word: "a level",
    why: "the page addresses university and HND students, not a school exam",
  },
  { word: "paper 1", why: "Paper 1 is gone" },
  { word: "paper 2", why: "Paper 2 is gone" },
  { word: "paper 3", why: "Paper 3 is gone" },
  { word: "score", why: "the page shows no score" },
  { word: "streak", why: "the page shows no streak" },
];

const CURRENCY =
  /(?:\b(?:FCFA|XAF|CFA|USD|EUR)\b|[₣$€£¥]|\b\d[\d\s.,]*\s*(?:FCFA|XAF|CFA)\b)/i;
const PERCENTAGE = /\b\d+(?:[.,]\d+)?\s*%/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;

// No email address survives anywhere in the public set, and no mailto: link.
// This is a shape check, not one exact string, because the footer used to
// publish a second address.
const EMAIL =
  /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|mailto:[A-Za-z0-9._%+-])/;

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCodePoint(Number.parseInt(number, 10)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function textFromHtml(html) {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const altText = [...withoutScripts.matchAll(/\balt="([^"]*)"/gi)]
    .map((match) => match[1])
    .join("\n");
  const visible = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeEntities(`${visible}\n${altText}`);
}

function metaFromHtml(html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const description =
    html
      .match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]
      ?.trim() ?? "";
  const canonical =
    html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1]?.trim() ?? "";
  return {
    title: decodeEntities(title),
    description: decodeEntities(description),
    canonical: decodeEntities(canonical),
  };
}

function context(text, index) {
  const start = Math.max(0, index - 48);
  const end = Math.min(text.length, index + 48);
  return `…${text.slice(start, end).replace(/\s+/g, " ").trim()}…`;
}

function findMatches(text, pattern) {
  const found = [];
  const global = new RegExp(
    pattern.source,
    `${pattern.flags.replace("g", "")}g`,
  );
  for (const match of text.matchAll(global)) {
    found.push({ value: match[0], at: match.index ?? 0 });
  }
  return found;
}

async function checkPage(page) {
  const url = page.path === "/" ? baseUrl : `${baseUrl}${page.path}`;
  let html;
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "TiCLearn landing honesty check" },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    html = await response.text();
  } catch (error) {
    console.error(`Landing honesty check could not read ${url}.`);
    console.error(
      `Start the app first (pnpm dev or pnpm build && pnpm start).`,
    );
    console.error(String(error));
    process.exit(1);
  }

  const text = textFromHtml(html);
  const meta = metaFromHtml(html);
  const failures = [];

  for (const { word, why } of BANNED_WORDS) {
    const pattern = new RegExp(`\\b${word.replace(/ /g, "\\s+")}\\b`, "gi");
    for (const match of findMatches(text, pattern)) {
      failures.push(`${match.value}: ${why} (${context(text, match.at)})`);
    }
    const inMeta = findMatches(`${meta.title}\n${meta.description}`, pattern);
    for (const match of inMeta) {
      failures.push(`${match.value}: ${why} (metadata)`);
    }
  }

  for (const match of findMatches(text, CURRENCY)) {
    failures.push(
      `currency amount “${match.value}” (${context(text, match.at)})`,
    );
  }
  for (const match of findMatches(text, PERCENTAGE)) {
    failures.push(
      `bare percentage “${match.value}” (${context(text, match.at)})`,
    );
  }
  for (const match of findMatches(text, PHONE)) {
    failures.push(`phone number “${match.value}” (${context(text, match.at)})`);
  }
  for (const match of findMatches(text, EMAIL)) {
    failures.push(
      `email address “${match.value}” (${context(text, match.at)})`,
    );
  }
  for (const match of findMatches(
    `${meta.title}\n${meta.description}`,
    EMAIL,
  )) {
    failures.push(`email address “${match.value}” (metadata)`);
  }

  if (!meta.title) failures.push("metadata is missing a title");
  if (!meta.description) failures.push("metadata is missing a description");
  if (page.requireCanonical && !meta.canonical) {
    failures.push("metadata is missing a canonical URL");
  }

  return { page, url, failures };
}

async function main() {
  let failed = false;
  for (const page of PAGES) {
    const { url, failures } = await checkPage(page);
    if (failures.length > 0) {
      failed = true;
      console.error(`Landing honesty check failed for ${url}:`);
      for (const failure of failures) console.error(`  - ${failure}`);
      continue;
    }
    console.log(`Landing honesty check passed for ${url}.`);
  }
  if (failed) process.exit(1);
}

main();
