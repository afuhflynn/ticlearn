import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { MODEL_ALLOWLIST } from "@/lib/ai/registry";

const headerSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  version: z.number().int().min(1),
  heat: z.number().min(0).max(1).optional().default(0.4),
  cap: z.number().int().positive().optional().default(2048),
  cacheSpanMs: z.number().int().min(0).optional().default(0),
  needsTools: z.boolean().optional().default(false),
  needsImages: z.boolean().optional().default(false),
  slots: z.array(z.string()).optional().default([]),
});

export type PromptSettings = z.infer<typeof headerSchema>;

export interface LoadedPrompt {
  text: string;
  settings: PromptSettings;
}

export class PromptError extends Error {
  constructor(
    public readonly promptName: string,
    message: string,
  ) {
    super(`[prompts/${promptName}] ${message}`);
    this.name = "PromptError";
  }
}

/** Static last resort text when a prompt file cannot be read. Never student data. */
export const FALLBACK_TEXT =
  "AI help is briefly unavailable. Please try again in a moment.";

interface CacheEntry {
  mtimeMs: number;
  text: string;
  settings: PromptSettings;
  /** When this parsed entry last served a read, for the hold window. */
  heldAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * How long a parsed prompt may answer reads without touching the disk. A stat
 * per request is a syscall on the hot path for no gain, since prompt files
 * change on a deploy rather than between two requests. Set to 0 to check the
 * file on every read, which is what tests want.
 */
const DEFAULT_PROMPT_FILE_HOLD_MS = 60_000;

function promptFileHoldMs(): number {
  const raw = Number(process.env.PROMPT_FILE_HOLD_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_PROMPT_FILE_HOLD_MS;
}

function promptsDir(): string {
  return path.resolve(process.cwd(), process.env.PROMPTS_DIR ?? "prompts");
}

function safeName(value: string, what: string, promptName: string): string {
  if (!/^[a-z0-9_]+$/.test(value)) {
    throw new PromptError(promptName, `unsafe ${what} "${value}"`);
  }
  return value;
}

function parseFile(_area: string, name: string, raw: string): LoadedPrompt {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (error) {
    throw new PromptError(
      name,
      `header block unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const header = headerSchema.safeParse(parsed.data);
  if (!header.success) {
    throw new PromptError(name, `bad header: ${header.error.message}`);
  }
  if (header.data.name !== name) {
    throw new PromptError(
      name,
      `header name "${header.data.name}" does not match file name`,
    );
  }
  if (!MODEL_ALLOWLIST.includes(header.data.model)) {
    throw new PromptError(
      name,
      `model "${header.data.model}" is not on the allow list`,
    );
  }
  return { text: parsed.content, settings: header.data };
}

export function renderPrompt(
  promptName: string,
  body: string,
  declaredSlots: string[],
  vars: Record<string, string | number | null | undefined>,
): string {
  for (const slot of declaredSlots) {
    const value = vars[slot];
    if (value === null || value === undefined) {
      throw new PromptError(promptName, `missing value for slot "${slot}"`);
    }
  }
  const text = body.replace(/\{\{(\w+)\}\}/g, (_match, slot: string) => {
    const value = vars[slot];
    if (value === null || value === undefined) {
      throw new PromptError(promptName, `missing value for slot "${slot}"`);
    }
    return String(value);
  });
  const leftover = text.match(/\{\{\w+\}\}/);
  if (leftover) {
    throw new PromptError(
      promptName,
      `unresolved slot ${leftover[0]} left after render`,
    );
  }
  return text;
}

function traceUse(settings: PromptSettings): void {
  if (process.env.PROMPTS_DEBUG === "1") {
    console.debug(
      `[prompts] ${settings.name} v${settings.version} ${settings.model}`,
    );
  }
}

function loadFromDisk(
  area: string,
  name: string,
): {
  raw: string;
  mtimeMs: number;
  file: string;
} {
  const file = path.join(
    promptsDir(),
    safeName(area, "area", name),
    `${safeName(name, "name", name)}.md`,
  );
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    throw new PromptError(name, `file not found`);
  }
  return { raw: fs.readFileSync(file, "utf8"), mtimeMs: stat.mtimeMs, file };
}

/** Read plus parse plus cache, without rendering slots. For checks and tooling. */
export function loadPromptRaw(area: string, name: string): LoadedPrompt {
  const key = `${area}/${name}`;
  const now = Date.now();

  // Inside the hold window the parsed entry answers straight from memory, so a
  // warm request never touches the disk at all.
  const held = cache.get(key);
  if (held && now - held.heldAt < promptFileHoldMs()) {
    return { text: held.text, settings: held.settings };
  }

  const { raw, mtimeMs } = loadFromDisk(area, name);
  let entry = cache.get(key);
  if (!entry || entry.mtimeMs !== mtimeMs) {
    const parsed = parseFile(area, name, raw);
    entry = {
      mtimeMs,
      text: parsed.text,
      settings: parsed.settings,
      heldAt: now,
    };
    cache.set(key, entry);
  } else {
    // Same file, so only the hold clock moves.
    entry.heldAt = now;
  }
  return { text: entry.text, settings: entry.settings };
}

/** What the calling path offers the prompt: tools, images, or neither. */
export interface PromptUse {
  tools?: boolean;
  images?: boolean;
}

function assertUse(
  promptName: string,
  settings: PromptSettings,
  use: PromptUse = {},
): void {
  if (settings.needsTools && !use.tools) {
    throw new PromptError(promptName, `needs tools but the caller offers none`);
  }
  if (settings.needsImages && !use.images) {
    throw new PromptError(
      promptName,
      `needs images but the caller offers none`,
    );
  }
}

/** Async file read with a memory hold keyed by file change time. */
export async function getPrompt(
  area: string,
  name: string,
  vars: Record<string, string | number | null | undefined> = {},
  use: PromptUse = {},
): Promise<LoadedPrompt> {
  const entry = loadPromptRaw(area, name);
  assertUse(name, entry.settings, use);
  traceUse(entry.settings);
  return {
    text: renderPrompt(name, entry.text, entry.settings.slots, vars),
    settings: entry.settings,
  };
}

/** Sync twin for call sites that cannot await (tool definitions). Same cache. */
export function getPromptSync(
  area: string,
  name: string,
  vars: Record<string, string | number | null | undefined> = {},
  use: PromptUse = {},
): LoadedPrompt {
  const entry = loadPromptRaw(area, name);
  assertUse(name, entry.settings, use);
  traceUse(entry.settings);
  return {
    text: renderPrompt(name, entry.text, entry.settings.slots, vars),
    settings: entry.settings,
  };
}

/** Tool description text for one tool. Bodies stay single purpose, no slots. */
export function getToolDescription(toolName: string): string {
  const { text } = getPromptSync("tools", toolName, {}, { tools: true });
  return text.trim();
}

/**
 * File settings as model call fields, one pattern for every call site.
 * Heat plus cap travel with the text they govern; the file cache span
 * wins over the task registry (0 means never cache); the ref traces
 * cache keys and logs to prompt name plus version. Callers spread this
 * into the orchestrator call beside the loaded text.
 */
export function promptCallFields(settings: PromptSettings): {
  modelOptions: { temperature: number; maxOutputTokens: number };
  cacheTtlMs: number;
  promptRef: { name: string; version: number; model: string };
} {
  return {
    modelOptions: {
      temperature: settings.heat,
      maxOutputTokens: settings.cap,
    },
    cacheTtlMs: settings.cacheSpanMs,
    promptRef: {
      name: settings.name,
      version: settings.version,
      model: settings.model,
    },
  };
}

/**
 * Worst case path only: a prompt that fails to load yields the static
 * fallback text instead of throwing. Logs carry the prompt name, never
 * slot values (which may hold student data). Productive paths use
 * getPrompt so header mistakes fail fast.
 */
export async function getPromptOrFallback(
  area: string,
  name: string,
  vars: Record<string, string | number | null | undefined> = {},
  use: PromptUse = {},
): Promise<string> {
  try {
    const { text } = await getPrompt(area, name, vars, use);
    return text;
  } catch (error) {
    const label = error instanceof PromptError ? error.message : String(error);
    console.warn(`[prompts] fallback for ${area}/${name}: ${label}`);
    return FALLBACK_TEXT;
  }
}

/** Test only: drop the memory hold so file edits take effect at once. */
export function clearPromptCache(): void {
  cache.clear();
}
