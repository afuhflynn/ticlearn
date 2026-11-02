import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  users: new Map<string, { credits: number }>(),
  txns: new Map<
    string,
    { userId: string; amount: number; type: string; referenceId?: string }
  >(),
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    creditTransaction: {
      findFirst: vi.fn(async ({ where }: any) => {
        for (const row of store.txns.values()) {
          if (
            row.userId === where.userId &&
            row.type === where.type &&
            (where.referenceId === undefined ||
              row.referenceId === where.referenceId)
          ) {
            return { ...row };
          }
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `txn-${store.txns.size}`, ...data };
        store.txns.set(
          `${data.userId}:${data.type}:${data.referenceId ?? ""}`,
          row,
        );
        return row;
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        const found = store.users.get(where.id);
        return found ? { credits: found.credits } : null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const found = store.users.get(where.id);
        if (!found) throw new Error("User not found");
        if (data.credits?.decrement) {
          found.credits -= data.credits.decrement;
        }
        if (data.credits?.increment) {
          found.credits += data.credits.increment;
        }
        return { credits: found.credits };
      }),
    },
  };
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: any) => {
          const found = store.users.get(where.id);
          return found ? { credits: found.credits } : null;
        }),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
  };
});

// The shared setup stubs this module; this suite tests the real one.
vi.mock("@/lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return actual;
});

import {
  InsufficientCreditsError,
  getUserCreditBalance,
  grantCredits,
  refundQuizReserve,
  spendCredits,
} from "@/lib/credits";

const USER = "student-1";

beforeEach(() => {
  vi.clearAllMocks();
  store.users.clear();
  store.txns.clear();
  store.users.set(USER, { credits: 200 });
});

describe("refundQuizReserve (spec 0042, covers: AC-6)", () => {
  it("refunds a reserve once under the refund key", async () => {
    const first = await refundQuizReserve({
      userId: USER,
      quizId: "quiz-1",
      amount: 50,
    });

    expect(first).toEqual({ balance: 250, duplicate: false });

    const stored = store.txns.get(`${USER}:QUIZ_GENERATION:refund:quiz-1`);
    expect(stored).toMatchObject({ amount: 50, type: "QUIZ_GENERATION" });
  });

  it("ignores a repeated refund for the same quiz", async () => {
    await refundQuizReserve({ userId: USER, quizId: "quiz-1", amount: 50 });

    const second = await refundQuizReserve({
      userId: USER,
      quizId: "quiz-1",
      amount: 50,
    });

    expect(second).toEqual({ balance: 250, duplicate: true });
  });

  it("nets a spend plus a refund to zero", async () => {
    await spendCredits({
      userId: USER,
      amount: 50,
      type: "QUIZ_GENERATION",
      referenceId: "quiz-2",
    });
    expect(await getUserCreditBalance(USER)).toBe(150);

    await refundQuizReserve({ userId: USER, quizId: "quiz-2", amount: 50 });

    expect(await getUserCreditBalance(USER)).toBe(200);
  });

  it("leaves a zero refund alone", async () => {
    const result = await refundQuizReserve({
      userId: USER,
      quizId: "quiz-3",
      amount: 0,
    });

    expect(result).toEqual({ balance: 200, duplicate: false });
    expect(store.txns.size).toBe(0);
  });
});

describe("spendCredits idempotency (spec 0042, covers: AC-6)", () => {
  it("debits once when a job retry spends under one quiz id", async () => {
    await spendCredits({
      userId: USER,
      amount: 50,
      type: "QUIZ_GENERATION",
      referenceId: "quiz-9",
    });
    const retry = await spendCredits({
      userId: USER,
      amount: 50,
      type: "QUIZ_GENERATION",
      referenceId: "quiz-9",
    });

    expect(retry).toEqual({ balance: 150 });
    expect(await getUserCreditBalance(USER)).toBe(150);
  });

  it("refuses a spend above the balance without moving money", async () => {
    await expect(
      spendCredits({
        userId: USER,
        amount: 500,
        type: "QUIZ_GENERATION",
        referenceId: "quiz-rich",
      }),
    ).rejects.toThrow(InsufficientCreditsError);

    expect(await getUserCreditBalance(USER)).toBe(200);
  });

  it("keeps grants working beside the reserve flow", async () => {
    const granted = await grantCredits({
      userId: USER,
      amount: 25,
      type: "BONUS",
      referenceId: "promo-1",
    });

    expect(granted).toEqual({ balance: 225, duplicate: false });
  });
});
