/**
 * Prompt registry check.
 *
 * Fails when any prompt file under prompts/ has a bad header, a model
 * outside the allow list, a name that misses its file name, or a slot in
 * the body that the header never declares. Also fails when model prompt
 * text lives inline in code outside lib/prompts (const prompt, prompt: or
 * system: template literals). Static lookup tables keyed by domain key
 * (topic descriptions, per task hints) stay in code by decision and are
 * not flagged. Run with: node scripts/check-prompts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_DIR = path.join(ROOT, "prompts");
const CODE_DIRS = ["lib", "app", "components", "hooks"];
const SKIP_DIRS = ["lib/prompts", "lib/generated", "tests"];
const MODEL_ALLOWLIST = [
  "google/gemini-3.7-flash",
  "google/gemini-2.5-flash",
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4.1-flash",
  "anthropic/claude-haiku-5.5",
  "z-ai/glm-4.7-flash",
  "openai/gpt-5-mini",
  "google/gemini-3.8-flash",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-oss-120b",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-medium-3.1",
  "x-ai/grok-4.7",
  "gemini-2.5-flash",
  "openrouter/fusion",
  // Hackathon models served through Meta Model API and Baseten (spec 0026).
  // These match MODEL_ALLOWLIST in lib/ai/registry.ts.
  "muse-spark-1.3",
  "meta-models/muse-spark-open-1026",
];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`[prompts:check] FAIL ${msg}`);
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// 1. Every prompt file parses and obeys the header contract.
const promptFiles = walk(PROMPTS_DIR).filter((f) => f.endsWith(".md"));
for (const file of promptFiles) {
  const rel = path.relative(ROOT, file);
  const parts = rel.split(path.sep);
  const area = parts[1];
  const name = parts[parts.length - 1].replace(/\.md$/, "");
  void area;
  let parsed;
  try {
    parsed = matter(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${rel} header unreadable: ${error.message}`);
    continue;
  }
  const h = parsed.data || {};
  if (typeof h.name !== "string" || !h.name) fail(`${rel} header needs a name`);
  if (h.name !== name) fail(`${rel} header name "${h.name}" misses file name`);
  if (!MODEL_ALLOWLIST.includes(h.model))
    fail(`${rel} model "${h.model}" outside allow list`);
  if (!Number.isInteger(h.version) || h.version < 1)
    fail(`${rel} version must be an integer of 1 or more`);
  if (typeof h.heat !== "number" || h.heat < 0 || h.heat > 1)
    fail(`${rel} heat must be a number from 0 to 1`);
  if (!Number.isInteger(h.cap) || h.cap < 1)
    fail(`${rel} cap must be a positive integer`);
  if (!Number.isInteger(h.cacheSpanMs) || h.cacheSpanMs < 0)
    fail(`${rel} cacheSpanMs must be an integer of 0 or more`);
  for (const flag of ["needsTools", "needsImages"]) {
    if (h[flag] !== undefined && typeof h[flag] !== "boolean")
      fail(`${rel} ${flag} must be true or false`);
  }
  const slots = Array.isArray(h.slots) ? h.slots : [];
  const used = new Set(
    [...parsed.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]),
  );
  for (const slot of used) {
    if (!slots.includes(slot)) fail(`${rel} slot {{${slot}}} never declared`);
  }
}
console.log(`[prompts:check] ${promptFiles.length} prompt files validated`);

// 2. No model prompt text inline in code.
const patterns = [
  /const prompt\s*=\s*`/g,
  /(?:^|[^_a-zA-Z])prompt:\s*`/gm,
  /(?:^|[^_a-zA-Z])system:\s*`/gm,
];
// Spec rule: a string literal over 200 chars bound to a prompt shaped
// name outside the loader is inline prompt text, whatever the spelling.
const NAME_HINT = /(prompt|system|instruct|preamble)/i;
const LONG_LITERAL = 200;
const offenders = [];
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
}
function eachLiteral(text, callback) {
  const re =
    /(?:^|[^\w$])(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;]+?)?\s*=\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|([A-Za-z_$][\w$]*)\s*:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g;
  let match;
  while (true) {
    match = re.exec(text);
    if (match === null) break;
    callback(match[1] ?? match[3], match[2] ?? match[4]);
  }
}
for (const dir of CODE_DIRS) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = path.relative(ROOT, file);
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (SKIP_DIRS.some((s) => rel === s || rel.startsWith(`${s}/`))) continue;
    const text = fs.readFileSync(file, "utf8");
    let hasPatternMatch = false;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        hasPatternMatch = true;
        break;
      }
    }
    if (hasPatternMatch) {
      offenders.push(rel);
      continue;
    }
    let flagged = null;
    eachLiteral(stripComments(text), (name, literal) => {
      if (flagged || !NAME_HINT.test(name)) return;
      const inner = literal.slice(1, -1);
      if (inner.length > LONG_LITERAL)
        flagged = `${rel} (${name}, ${inner.length} chars)`;
    });
    if (flagged) offenders.push(flagged);
  }
}
if (offenders.length > 0) {
  fail(`inline prompt text in:\n  - ${offenders.join("\n  - ")}`);
} else {
  console.log("[prompts:check] no inline prompt text in code");
}

// 3. OpenRouter only: provider imports live in lib/ai/instances.ts alone.
const PROVIDER_RE =
  /from\s+["']@ai-sdk\/(google|openai|openai-compatible)["']/g;
const providerOffenders = [];
for (const dir of CODE_DIRS) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = path.relative(ROOT, file);
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (rel === "lib/ai/instances.ts") continue;
    const text = fs.readFileSync(file, "utf8");
    PROVIDER_RE.lastIndex = 0;
    if (PROVIDER_RE.test(text)) providerOffenders.push(rel);
  }
}
if (providerOffenders.length > 0) {
  fail(
    `direct provider import outside lib/ai/instances.ts:\n  - ${providerOffenders.join("\n  - ")}`,
  );
} else {
  console.log(
    "[prompts:check] provider imports flow through lib/ai/instances.ts",
  );
}

if (failures > 0) {
  console.error(`[prompts:check] ${failures} problem(s) found`);
  process.exit(1);
}
console.log("[prompts:check] ok");
