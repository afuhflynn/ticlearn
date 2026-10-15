import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "ui-conventions-baseline.json");
const INVENTORY = path.join(ROOT, "docs", "design-system-inventory.md");

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
    rawAria: !uiExcluded && !rel.startsWith("components/ai-elements/"),
    handRolled: !uiExcluded,
  };
}

const violations = {
  "palette-colour": new Set(),
  "dark-colour-utility": new Set(),
  "raw-aria": new Set(),
  "hand-rolled-control": new Set(),
};

let totalFiles = 0;
for (const dir of SCAN_DIRS) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    if (!isTargetFile(file)) continue;
    const rel = path.relative(ROOT, file);
    totalFiles += 1;
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
  fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + "\n");
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
