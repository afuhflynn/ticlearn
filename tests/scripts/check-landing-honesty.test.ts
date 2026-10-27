import { execFile } from "node:child_process";
import fs from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

/**
 * The landing honesty gate, from spec 0016 AC-10 and spec 0021 AC-2 and AC-8.
 *
 * This is the only check in the project that reads a built page, so the tests
 * run it for real against a local server: a served page is the only honest
 * input, and the command's exit code is the only honest output. The three
 * cases below are the ones the gate exists for, plus the one page it is
 * allowed to let state a price.
 */

const ROOT = process.cwd();
const SCRIPT = "scripts/check-landing-honesty.mjs";
const source = fs.readFileSync(path.join(ROOT, SCRIPT), "utf8");
const run = promisify(execFile);

/**
 * The paths the gate fetches, read from the script it fetches them with. The
 * list is sliced out first, because an entry may be written across several
 * lines (the pricing page carries an extra flag) and a line-anchored pattern
 * would quietly miss it.
 */
function readGatePaths(): string[] {
  const start = source.indexOf("const PAGES");
  const end = source.indexOf("];", start);
  const block = start === -1 || end === -1 ? "" : source.slice(start, end);

  return Array.from(block.matchAll(/path: "([^"]+)"/g), (match) => match[1]);
}

const GATE_PATHS = readGatePaths();

const HONEST = {
  title: "TiCLearn · Study your own lecture notes",
  description:
    "Notes, quizzes and Tip, the tutor that teaches from your own material.",
  canonical: "https://ticlearn.ticsummit.org/",
  body: "Bring your lecture notes and study them with Tip.",
};

function pageHtml(
  overrides: Partial<typeof HONEST> = {},
  options: { canonical?: boolean } = {},
): string {
  const page = { ...HONEST, ...overrides };
  const canonical =
    options.canonical === false
      ? ""
      : `<link rel="canonical" href="${page.canonical}" />`;

  return `<!doctype html><html><head><title>${page.title}</title><meta name="description" content="${page.description}" />${canonical}</head><body><main>${page.body}</main></body></html>`;
}

type GateRun = { code: number; stdout: string; stderr: string };

/**
 * Serves the ten public paths, with an override for any page whose HTML the
 * case needs to bend, and runs the gate against it.
 */
async function runGate(
  overrides: Record<string, string> = {},
): Promise<GateRun> {
  const serving = new Set(GATE_PATHS);
  const server = createServer((request, response) => {
    const requested = (request.url ?? "/").replace(/\?.*$/, "");
    if (!serving.has(requested)) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(overrides[requested] ?? pageHtml());
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [SCRIPT, `http://127.0.0.1:${port}`],
      { cwd: ROOT },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: failure.code ?? 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("the gate passes an honest public set (AC-8)", () => {
  it("reads the twelve pages it fetches from its own list", () => {
    expect(GATE_PATHS).toHaveLength(12);
  });

  it("passes when every page carries its metadata and says nothing it must not", async () => {
    const result = await runGate();

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("Landing honesty check passed");
  });

  it("lets the pricing page state the real amount, and no other page", async () => {
    const priced = pageHtml({ body: "One Semester Pass at 2,500 FCFA." });
    const pricingOnly = await runGate({ "/pricing": priced });

    expect(pricingOnly.code, pricingOnly.stderr).toBe(0);

    const everywhere = await runGate({
      "/pricing": priced,
      "/about": priced,
    });

    expect(everywhere.code).toBe(1);
    expect(everywhere.stderr).toContain("/about");
  });
});

describe("the gate fails the defects it exists to catch (AC-2, AC-8)", () => {
  it("fails a page with no canonical URL", async () => {
    const result = await runGate({
      "/faq": pageHtml({}, { canonical: false }),
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("canonical");
    expect(result.stderr).toContain("/faq");
  });

  it("fails a page that names a surface the product cut", async () => {
    const result = await runGate({
      "/faq": pageHtml({ body: "Join the leaderboard and climb." }),
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("leaderboard");
  });

  it("fails a page whose metadata is missing, even with a clean body", async () => {
    const result = await runGate({
      "/contact":
        "<!doctype html><html><head></head><body>Reach us.</body></html>",
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("metadata is missing a title");
    expect(result.stderr).toContain("metadata is missing a description");
  });
});
