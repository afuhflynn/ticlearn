import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "ui-conventions-baseline.json");
const INVENTORY = path.join(ROOT, "docs", "design-system-inventory.md");
const LOADER_ALLOWLIST = path.join(ROOT, "scripts", "loading-allowlist.json");

/**
 * The spinner rule. It reported first, so the whole list of spinners in the
 * app was visible, and it fails now that the sweep is done. A file that keeps
 * a spinner needs an entry in the allowlist with a one line reason.
 */
const SPINNER_RULE_MODE = "fail";

/** The names a spinner comes in. A file that imports one of these is a file
 * that is drawing a spinner. */
const LOADER_NAMES = ["Loader", "Loader2", "LoaderIcon", "Loader2Icon"];

/** The primitive folders. A spinner primitive lives here, and the rule does
 * not look inside them. */
const SPINNER_PRIMITIVE_FOLDERS = ["components/ui/", "components/ai-elements/"];

const COLOR_NAMES =
  "white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";

const rePalette = new RegExp(
  `\\b(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(?:${COLOR_NAMES})-\\d{2,3}\\b`,
  "g",
);
const rePaletteBare =
  /\b(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(white|black)\b/g;
const reDarkColour = new RegExp(
  `dark:(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(?:${COLOR_NAMES})-\\d{2,3}\\b`,
  "g",
);
const reDarkColourBare =
  /dark:(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(white|black)\b/g;
const reRawAria = /\b(role|aria-[a-z-]+)\s*=/g;
const reHandRolled = /<(button|input|select|textarea)\b/g;

const SCAN_DIRS = ["app", "components", "hooks", "lib"];
const EXCLUDE_UI = ["components/ui/", "components/ai-elements/"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isExcluded(rel) {
  return EXCLUDE_UI.some((p) => rel.startsWith(p));
}

function isTargetFile(file) {
  return (
    file.endsWith(".tsx") ||
    file.endsWith(".ts") ||
    file.endsWith(".jsx") ||
    file.endsWith(".js")
  );
}

function classify(rel) {
  const uiExcluded = isExcluded(rel);
  return {
    palette: !uiExcluded,
    dark: true,
    // Email tables intentionally use role="presentation" for clients that
    // do not reliably infer table layout from the markup alone.
    rawAria:
      !uiExcluded &&
      !rel.startsWith("components/ai-elements/") &&
      !rel.startsWith("lib/email/"),
    handRolled: !uiExcluded,
    spinner: !SPINNER_PRIMITIVE_FOLDERS.some((p) => rel.startsWith(p)),
  };
}

/**
 * The spinner a file draws, and where it draws it.
 *
 * A spinner inside a button is the button telling the student that their own
 * action is still running. That is not a loading state and it is never
 * reported. A spinner anywhere else is a student staring at a shape that
 * says nothing about what is coming.
 */
function findSpinnerSites(src) {
  const imports = new Set();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g;
  for (const match of src.matchAll(importRe)) {
    for (const name of match[1].split(",")) {
      const clean = name
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (LOADER_NAMES.includes(clean)) imports.add(clean);
    }
  }
  if (imports.size === 0) return [];

  const tagRe =
    /<(\/?)(Button|button|Loader2Icon|LoaderIcon|Loader2|Loader)\b([^>]*)>/g;
  const sites = [];
  let depth = 0;
  let match;
  while (true) {
    match = tagRe.exec(src);
    if (match === null) break;
    const [, closing, name, rest] = match;
    const selfClosing = /\/\s*$/.test(rest);
    if (name === "Button" || name === "button") {
      if (closing) depth = Math.max(0, depth - 1);
      else if (!selfClosing) depth += 1;
      continue;
    }
    if (!imports.has(name)) continue;
    if (depth > 0) continue;
    sites.push(src.slice(0, match.index).split("\n").length);
  }
  return sites;
}

/**
 * A hand written spinner. An element that spins on its own, with no spinner
 * primitive behind it, is the same problem wearing a different hat.
 */
function findRawSpinnerSites(src) {
  const sites = [];
  const tagRe = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*\banimate-spin\b[^>]*)>/g;
  let match;
  while (true) {
    match = tagRe.exec(src);
    if (match === null) break;
    if (LOADER_NAMES.includes(match[1])) continue;
    sites.push(src.slice(0, match.index).split("\n").length);
  }
  return sites;
}

const violations = {
  "palette-colour": new Set(),
  "dark-colour-utility": new Set(),
  "raw-aria": new Set(),
  "hand-rolled-control": new Set(),
};

/** Every spinner drawn outside a button, with the line it is drawn on. */
const spinnerSites = new Map();

for (const dir of SCAN_DIRS) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    if (!isTargetFile(file)) continue;
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");
    const cls = classify(rel);
    if (cls.palette && (rePalette.test(src) || rePaletteBare.test(src))) {
      violations["palette-colour"].add(rel);
    }
    rePalette.lastIndex = 0;
    rePaletteBare.lastIndex = 0;
    if (cls.dark && (reDarkColour.test(src) || reDarkColourBare.test(src))) {
      violations["dark-colour-utility"].add(rel);
    }
    reDarkColour.lastIndex = 0;
    reDarkColourBare.lastIndex = 0;
    if (cls.rawAria && reRawAria.test(src)) {
      violations["raw-aria"].add(rel);
    }
    reRawAria.lastIndex = 0;
    if (cls.handRolled && reHandRolled.test(src)) {
      violations["hand-rolled-control"].add(rel);
    }
    reHandRolled.lastIndex = 0;
    if (cls.spinner) {
      const sites = [...findSpinnerSites(src), ...findRawSpinnerSites(src)];
      if (sites.length > 0) {
        spinnerSites.set(
          rel,
          sites.sort((a, b) => a - b),
        );
      }
    }
  }
}

// reset regex state
for (const r of [
  rePalette,
  rePaletteBare,
  reDarkColour,
  reDarkColourBare,
  reRawAria,
  reHandRolled,
])
  r.lastIndex = 0;

let baseline = {};
if (fs.existsSync(BASELINE)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
}

if (process.env.WRITE_BASELINE === "1") {
  const out = {};
  for (const rule of Object.keys(violations)) {
    out[rule] = [...violations[rule]].sort();
  }
  fs.writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
  console.log("[ui:check] baseline written");
  process.exit(0);
}

let failures = 0;
for (const rule of Object.keys(violations)) {
  const files = [...violations[rule]].sort();
  const baselined = new Set(baseline[rule] || []);
  let newCount = 0;
  for (const f of files) {
    if (!baselined.has(f)) {
      newCount += 1;
      console.error(`[ui:check] FAIL ${rule}: ${f}`);
      failures += 1;
    }
  }
  // renamed or deleted baseline entries warn
  for (const f of baselined) {
    if (!files.includes(f)) {
      console.warn(
        `[ui:check] WARN ${rule}: baselined file no longer violates (renamed or deleted): ${f}`,
      );
    }
  }
  console.log(
    `[ui:check] ${rule}: total ${files.length}, new ${newCount}, baselined ${files.length - newCount}`,
  );
}

// The spinner rule.
//
// It does not use the baseline. It uses the allowlist, because a spinner that
// stays needs a reason, and a reason that says "later" is how the rule dies.
const loaderAllowlist = fs.existsSync(LOADER_ALLOWLIST)
  ? JSON.parse(fs.readFileSync(LOADER_ALLOWLIST, "utf8"))
  : {};
for (const key of Object.keys(loaderAllowlist)) {
  if (key.startsWith("_")) delete loaderAllowlist[key];
}

const spinnerFiles = [...spinnerSites.keys()].sort();
let spinnerNew = 0;
for (const file of spinnerFiles) {
  const reason = loaderAllowlist[file];
  const lines = spinnerSites.get(file);
  if (reason) {
    console.log(
      `[ui:check] spinner allowlisted: ${file} (${lines.join(", ")}), ${reason}`,
    );
    continue;
  }
  spinnerNew += 1;
  const message = `[ui:check] spinner-loader: ${file} (${lines.join(", ")})`;
  if (SPINNER_RULE_MODE === "fail") {
    console.error(`[ui:check] FAIL ${message}`);
    failures += 1;
  } else {
    console.warn(`[ui:check] ${message}`);
  }
}
for (const file of Object.keys(loaderAllowlist)) {
  if (!spinnerSites.has(file)) {
    console.warn(
      `[ui:check] WARN spinner-loader: allowlisted file no longer draws a spinner: ${file}`,
    );
  }
}
console.log(
  `[ui:check] spinner-loader: ${spinnerFiles.length} files, ${spinnerNew} not allowlisted, mode ${SPINNER_RULE_MODE}`,
);

// inventory check
const uiFiles = fs
  .readdirSync(path.join(ROOT, "components", "ui"))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `components/ui/${f}`)
  .sort();
const invText = fs.readFileSync(INVENTORY, "utf8");
const m = invText.match(/```json\n([\s\S]*?)\n```/);
let inv = [];
if (m) {
  try {
    inv = JSON.parse(m[1]);
  } catch (e) {
    console.error(`[ui:check] FAIL inventory json parse: ${e.message}`);
    failures += 1;
  }
}
const invFiles = new Set(inv.map((e) => e.file));
for (const f of uiFiles) {
  if (!invFiles.has(f)) {
    console.error(`[ui:check] FAIL inventory missing entry: ${f}`);
    failures += 1;
  }
}
for (const e of inv) {
  if (!uiFiles.includes(e.file)) {
    console.error(
      `[ui:check] FAIL inventory entry for missing file: ${e.file}`,
    );
    failures += 1;
  }
  const keys = Object.keys(e).sort();
  const expected = [
    "base",
    "exception",
    "file",
    "lastRebase",
    "registryVersion",
  ];
  if (keys.join(",") !== expected.join(",")) {
    console.error(`[ui:check] FAIL inventory entry keys: ${e.file}`);
    failures += 1;
  }
}
console.log(
  `[ui:check] inventory: ${uiFiles.length} files, ${inv.length} entries`,
);

if (failures > 0) {
  console.error(`[ui:check] ${failures} violation(s)`);
  process.exit(1);
}
console.log("[ui:check] OK");
