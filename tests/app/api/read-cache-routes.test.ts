import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as getAdminPaymentSettings,
  PUT as putAdminPaymentSettings,
} from "@/app/api/admin/payment-settings/route";
import {
  GET as getAdminPlatformSettings,
  PUT as putAdminPlatformSettings,
} from "@/app/api/admin/platform-settings/route";
import { DELETE as deleteNote } from "@/app/api/notes/[id]/route";
import { GET as getPaymentSettings } from "@/app/api/payment-settings/route";
import { auth } from "@/lib/auth";
import { clearMemory } from "@/lib/cache";
import { deleteFile } from "@/lib/file";
import { getPlatformSettings } from "@/lib/platform-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings-direct";
import { prisma } from "@/lib/prisma";
import { pruneOrphanTopics } from "@/lib/topics";

/**
 * Spec 0010, slice five, at the route boundary. The wrapper tests in
 * `tests/lib/cache/reads.test.ts` prove the cache behaves. These tests prove
 * the five routes are wired to it: a read is reused, a write clears the entry
 * it changed before the caller hears success, an unauthorised caller never
 * reaches the cache or the source, and a broken store never fails a student or
 * an admin.
 *
 * The stand in for `app_cache` is one Map, so a read that the test clears out
 * of the memory layer really does go back to the shared store.
 */

const harness = vi.hoisted(() => ({
  table: new Map<
    string,
    {
      namespace: string;
      value: unknown;
      expiresAt: Date;
      createdAt: Date;
    }
  >(),
  events: [] as string[],
  platform: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = harness.table.get(where.key);
        if (!row) return null;
        return { key: where.key, ...row };
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { key: string };
          create: {
            namespace: string;
            value: unknown;
            expiresAt: Date;
            createdAt?: Date;
          };
          update: Partial<{
            value: unknown;
            expiresAt: Date;
            createdAt: Date;
          }>;
        }) => {
          const existing = harness.table.get(where.key);
          if (existing) {
            Object.assign(existing, update);
            return { key: where.key, ...existing };
          }
          const row = {
            namespace: create.namespace,
            value: create.value,
            expiresAt: create.expiresAt,
            createdAt: create.createdAt ?? new Date(),
          };
          harness.table.set(where.key, row);
          return { key: where.key, ...row };
        },
      ),
      deleteMany: vi.fn(
        async ({ where }: { where: { key?: string; namespace?: string } }) => {
          harness.events.push(
            where.key
              ? "appCache.deleteMany:key"
              : `appCache.deleteMany:namespace:${where.namespace}`,
          );
          let removed = 0;
          for (const [key, row] of harness.table) {
            const keyMatches = where.key ? key === where.key : false;
            const namespaceMatches = where.namespace
              ? row.namespace === where.namespace
              : false;
            if (keyMatches || namespaceMatches) {
              harness.table.delete(key);
              removed += 1;
            }
          }
          return { count: removed };
        },
      ),
      count: vi.fn(async () => harness.table.size),
      findMany: vi.fn(async () => []),
    },
    platformSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    paymentSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    note: { findFirst: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/file", () => ({
  deleteFile: vi.fn(() => Promise.resolve()),
  getUploadThingFileKey: vi.fn(() => "file-key"),
}));

vi.mock("@/lib/topics", () => ({
  pruneOrphanTopics: vi.fn(() => Promise.resolve(0)),
}));

// The setup file mocks the cached settings accessor for every test. This file
// is about that accessor, so it runs the real one over the fake Prisma below.
vi.mock("@/lib/platform-settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/platform-settings")>();
  return { ...actual };
});

type Fn = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  appCache: { findUnique: Fn; deleteMany: Fn };
  platformSettings: { findUnique: Fn; upsert: Fn };
  paymentSettings: { findUnique: Fn; create: Fn; upsert: Fn };
  note: { findFirst: Fn; delete: Fn };
};

const PAYMENT_DEFAULTS = {
  key: "global",
  mtnNumber: "+237600000001",
  mtnHolderName: "Ada Nfor",
  orangeNumber: "+237699000002",
  orangeHolderName: "Bruno Tchoumi",
};

const paymentRow = { ...PAYMENT_DEFAULTS };

const STUDENT = "student-a";

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, body: JSON.stringify(body) });
}

/** Labels of the writes and invalidations that matter for ordering. */
function writeOrder() {
  return harness.events.filter(
    (event) =>
      event === "platformSettings.upsert" ||
      event === "paymentSettings.upsert" ||
      event === "note.delete" ||
      event.startsWith("appCache.deleteMany"),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.table.clear();
  harness.events.length = 0;
  harness.platform = { key: "global", ...DEFAULT_PLATFORM_SETTINGS };
  Object.assign(paymentRow, PAYMENT_DEFAULTS);
  clearMemory();

  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  signIn({ id: "admin-1", role: "ADMIN" });

  db.platformSettings.findUnique.mockImplementation(
    async () => harness.platform,
  );
  db.platformSettings.upsert.mockImplementation(
    async ({
      create,
      update,
    }: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      harness.events.push("platformSettings.upsert");
      if (!harness.platform) {
        harness.platform = { ...create };
      } else {
        Object.assign(harness.platform, update);
      }
      return harness.platform;
    },
  );

  db.paymentSettings.findUnique.mockImplementation(async () => paymentRow);
  db.paymentSettings.create.mockImplementation(async () => paymentRow);
  db.paymentSettings.upsert.mockImplementation(
    async ({
      create,
      update,
    }: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      harness.events.push("paymentSettings.upsert");
      Object.assign(paymentRow, create, update);
      return paymentRow;
    },
  );

  db.note.findFirst.mockResolvedValue({
    id: "note-1",
    uploadthingKey: "file-key",
    fileUrl: "https://test.ufs.sh/f/file-key",
    topicNotes: [{ topicId: "topic-1" }],
  });
  db.note.delete.mockImplementation(async () => {
    harness.events.push("note.delete");
    return {};
  });

  vi.mocked(deleteFile).mockResolvedValue(undefined);
  vi.mocked(pruneOrphanTopics).mockResolvedValue(0);
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("GET /api/payment-settings (covers: AC-23, AC-25, AC-29)", () => {
  it("answers the four fields with no session, as it did before the cache", async () => {
    const res = await getPaymentSettings();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      mtnNumber: paymentRow.mtnNumber,
      mtnHolderName: paymentRow.mtnHolderName,
      orangeNumber: paymentRow.orangeNumber,
      orangeHolderName: paymentRow.orangeHolderName,
    });
  });

  it("holds one entry and answers the second read from it", async () => {
    const first = await getPaymentSettings();
    const second = await getPaymentSettings();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    expect(db.paymentSettings.findUnique).toHaveBeenCalledTimes(1);

    expect(harness.table.size).toBe(1);
    const [key, row] = [...harness.table.entries()][0];
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(row.namespace).toBe("read:payment-settings");

    const life = row.expiresAt.getTime() - row.createdAt.getTime();
    expect(life).toBeGreaterThanOrEqual(58_000);
    expect(life).toBeLessThanOrEqual(62_000);
  });

  it("never serves an expired row, so the source read runs again", async () => {
    await getPaymentSettings();

    for (const row of harness.table.values()) {
      row.expiresAt = new Date(Date.now() - 1_000);
    }
    clearMemory();
    db.paymentSettings.findUnique.mockResolvedValue({
      ...paymentRow,
      mtnNumber: "+237600000009",
    });

    const res = await getPaymentSettings();

    expect(db.paymentSettings.findUnique).toHaveBeenCalledTimes(2);
    await expect(res.json()).resolves.toMatchObject({
      mtnNumber: "+237600000009",
    });
  });

  it("still answers when the cache store throws", async () => {
    db.appCache.findUnique.mockRejectedValueOnce(new Error("connection reset"));

    const res = await getPaymentSettings();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      mtnNumber: paymentRow.mtnNumber,
    });
  });
});

describe("GET /api/admin/payment-settings (covers: AC-25)", () => {
  it("refuses a caller with no session before reading the row", async () => {
    signIn(null);

    const res = await getAdminPaymentSettings();

    expect(res.status).toBe(401);
    expect(db.paymentSettings.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a signed in student before reading the row", async () => {
    signIn({ id: STUDENT, role: "USER" });

    const res = await getAdminPaymentSettings();

    expect(res.status).toBe(403);
    expect(db.paymentSettings.findUnique).not.toHaveBeenCalled();
  });

  it("gives an admin the four fields, creating the row when there is none", async () => {
    db.paymentSettings.findUnique.mockResolvedValueOnce(null);

    const res = await getAdminPaymentSettings();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ settings: paymentRow });
    expect(db.paymentSettings.create).toHaveBeenCalledTimes(1);
  });
});

describe("PUT /api/admin/payment-settings (covers: AC-25, AC-27, AC-28)", () => {
  it("refuses a caller with no session without writing or clearing anything", async () => {
    signIn(null);

    const res = await putAdminPaymentSettings(
      jsonRequest("http://localhost:3000/api/admin/payment-settings", "PUT", {
        mtnNumber: "+237600000003",
      }),
    );

    expect(res.status).toBe(401);
    expect(db.paymentSettings.upsert).not.toHaveBeenCalled();
    expect(harness.events).not.toContain(
      "appCache.deleteMany:namespace:read:payment-settings",
    );
  });

  it("refuses a signed in student without writing or clearing anything", async () => {
    signIn({ id: STUDENT, role: "USER" });

    const res = await putAdminPaymentSettings(
      jsonRequest("http://localhost:3000/api/admin/payment-settings", "PUT", {
        mtnNumber: "+237600000003",
      }),
    );

    expect(res.status).toBe(403);
    expect(db.paymentSettings.upsert).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });

  it("clears the global namespace after it saves", async () => {
    const res = await putAdminPaymentSettings(
      jsonRequest("http://localhost:3000/api/admin/payment-settings", "PUT", {
        mtnNumber: "  +237600000003  ",
        mtnHolderName: "  Ada Nfor  ",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
    expect(writeOrder()).toEqual([
      "paymentSettings.upsert",
      "appCache.deleteMany:namespace:read:payment-settings",
    ]);
    expect(paymentRow.mtnNumber).toBe("+237600000003");
    expect(paymentRow.mtnHolderName).toBe("Ada Nfor");
  });

  it("shows a saved number to the public read before the life expires", async () => {
    await getPaymentSettings();

    await putAdminPaymentSettings(
      jsonRequest("http://localhost:3000/api/admin/payment-settings", "PUT", {
        mtnNumber: "+237600000007",
      }),
    );

    const res = await getPaymentSettings();

    await expect(res.json()).resolves.toMatchObject({
      mtnNumber: "+237600000007",
    });
  });
});

describe("GET /api/admin/platform-settings (covers: AC-25)", () => {
  it("refuses a student before any cache or source read", async () => {
    signIn({ id: STUDENT, role: "USER" });

    const res = await getAdminPlatformSettings();

    expect(res.status).toBe(403);
    expect(harness.table.size).toBe(0);
    expect(writeOrder()).toEqual([]);
  });

  it("returns the stored settings and the defaults for an admin", async () => {
    const res = await getAdminPlatformSettings();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      settings: Record<string, unknown>;
      defaults: Record<string, unknown>;
    };
    expect(body.defaults).toEqual(DEFAULT_PLATFORM_SETTINGS);
    expect(body.settings.creditsPer1000Xaf).toBe(
      DEFAULT_PLATFORM_SETTINGS.creditsPer1000Xaf,
    );
  });
});

describe("PUT /api/admin/platform-settings (covers: AC-27, AC-28)", () => {
  it("rejects a minimum above the maximum without writing or clearing", async () => {
    const res = await putAdminPlatformSettings(
      jsonRequest("http://localhost:3000/api/admin/platform-settings", "PUT", {
        minCreditPurchaseXaf: 500,
        maxCreditPurchaseXaf: 100,
      }),
    );

    expect(res.status).toBe(400);
    expect(db.platformSettings.upsert).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });

  it("rejects an invalid update without writing or clearing", async () => {
    const res = await putAdminPlatformSettings(
      jsonRequest("http://localhost:3000/api/admin/platform-settings", "PUT", {
        creditCostQuizGeneration: "free",
      }),
    );

    expect(res.status).toBe(400);
    expect(db.platformSettings.upsert).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });

  it("saves, clears the namespace, and the next settings read sees the new cost", async () => {
    await getAdminPlatformSettings();
    harness.events.length = 0;

    const res = await putAdminPlatformSettings(
      jsonRequest("http://localhost:3000/api/admin/platform-settings", "PUT", {
        creditsPer1000Xaf: 60,
      }),
    );

    expect(res.status).toBe(200);
    expect(writeOrder()).toEqual([
      "platformSettings.upsert",
      "appCache.deleteMany:namespace:read:platform-settings",
    ]);

    const settings = await getPlatformSettings();
    expect(settings.creditsPer1000Xaf).toBe(60);
  });
});

describe("DELETE /api/notes/[id] (covers: AC-27, AC-28)", () => {
  function removeNote(id = "note-1") {
    return deleteNote(new Request(`http://localhost:3000/api/notes/${id}`), {
      params: Promise.resolve({ id }),
    });
  }

  it("refuses a caller with no session without deleting or clearing", async () => {
    signIn(null);

    const res = await removeNote();

    expect(res.status).toBe(401);
    expect(db.note.delete).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });

  it("refuses a note that belongs to someone else", async () => {
    signIn({ id: STUDENT, role: "USER" });
    db.note.findFirst.mockResolvedValue(null);

    const res = await removeNote();

    expect(res.status).toBe(404);
    expect(db.note.delete).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });

  it("deletes the row and prunes the topics it leaves behind", async () => {
    signIn({ id: STUDENT, role: "USER" });
    harness.events.length = 0;

    const res = await removeNote();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(writeOrder()).toEqual(["note.delete"]);
    expect(pruneOrphanTopics).toHaveBeenCalledWith(["topic-1"]);
  });

  it("keeps the note and skips the delete when the file cannot be deleted", async () => {
    signIn({ id: STUDENT, role: "USER" });
    vi.mocked(deleteFile).mockRejectedValueOnce(new Error("uploadthing down"));

    const res = await removeNote();

    expect(res.status).toBe(502);
    expect(db.note.delete).not.toHaveBeenCalled();
    expect(writeOrder()).toEqual([]);
  });
});
