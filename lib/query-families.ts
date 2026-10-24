/**
 * One home for every client cache decision, from spec 0010 slice two.
 * A family is a group of reads that change on the same rhythm. Each family
 * carries a stale time, how long a fresh answer may be reused before a refetch,
 * and a keep time, how long an unused answer is held in memory before it is
 * dropped. No hook writes either number, so a page switch costs nothing when
 * nothing changed and a student never refetches data they already have.
 *
 * The stale time and the keep time work together. With a keep time longer than
 * the stale time, navigating back paints what is already there at once and a
 * background refresh quietly replaces it, which is what acceptance criterion 14
 * asks for. With a stale time of zero the same shape still holds for the
 * families that must never look old, so money and quota always read fresh while
 * the paint stays instant.
 */

import type { QueryClient } from "@tanstack/react-query";

/** One minute in milliseconds. */
const MINUTE = 60_000;
/** One hour in milliseconds. */
const HOUR = 60 * MINUTE;

export interface QueryFamilyPolicy {
  /** How long a fresh answer may be reused before the next read refetches. */
  staleTimeMs: number;
  /** How long an unused answer is held in memory before it is dropped. */
  gcTimeMs: number;
}

/**
 * Reads that change on a semester, an admin action, or a nightly rollup. The
 * spec allows five minutes to hours here, and thirty minutes sits in the middle
 * while staying well inside it.
 */
const LONG_LIVED: QueryFamilyPolicy = {
  staleTimeMs: 30 * MINUTE,
  gcTimeMs: 6 * HOUR,
};

/**
 * Reads that must never look old, because stale money or quota costs trust.
 */
const ALWAYS_FRESH: QueryFamilyPolicy = {
  staleTimeMs: 0,
  gcTimeMs: 2 * MINUTE,
};

/**
 * A plan sits with the long lived reads, except that a payment can change it at
 * any moment and the webhook cannot reach a client cache to say so. Five
 * minutes is the same read this hook had before, and it is inside the range the
 * spec allows.
 */
const PLAN: QueryFamilyPolicy = {
  staleTimeMs: 5 * MINUTE,
  gcTimeMs: 30 * MINUTE,
};

/** Content lists, where a mutation writes the fresh value straight away. */
const CONTENT_LIST: QueryFamilyPolicy = {
  staleTimeMs: 60_000,
  gcTimeMs: 10 * MINUTE,
};

export const queryFamilies = {
  /** The student's own profile. */
  profile: LONG_LIVED,
  /** Their plan, which a payment or an admin upgrade changes. */
  plan: PLAN,
  /** Their subscription record. */
  subscription: PLAN,
  /** Payment settings an admin owns. */
  settings: LONG_LIVED,
  /** Admin console reads, which poll on their own where they need to. */
  admin: { staleTimeMs: 5 * MINUTE, gcTimeMs: 2 * HOUR },
  /** Whether the student has rated the app. */
  rating: LONG_LIVED,
  /** Credits, a number a student spends. */
  credits: ALWAYS_FRESH,
  /** Plan usage counters. */
  usage: ALWAYS_FRESH,
  /** Chat conversations and messages. */
  chat: ALWAYS_FRESH,
  /** Notes, which poll on their own while a note is processing. */
  notes: CONTENT_LIST,
  /** Quizzes, which poll on their own while a quiz is generating. */
  quizzes: CONTENT_LIST,
  /**
   * The dashboard, which reads where the student left off. It behaves like the
   * content lists; every mutation that writes one of the three cards
   * invalidates it in the same breath.
   */
  dashboard: CONTENT_LIST,
  /**
   * The student's own numbers on the dashboard. The spec's table does not name
   * this read, and it behaves like the content lists because a submission
   * writes it and then invalidates it.
   */
  stats: CONTENT_LIST,
} as const satisfies Record<string, QueryFamilyPolicy>;

export type QueryFamily = keyof typeof queryFamilies;

/**
 * Groups mirror the server cache tags that slice three will invalidate, so one
 * write clears the client and, later, the server in the same breath. A mutation
 * invalidates the groups it touched rather than a hand written key list, and a
 * group name is the one place a key prefix is spelled out.
 */
export const queryGroups = {
  profile: [["profile"], ["session"]],
  settings: [["settings"]],
  paymentSettings: [["payment", "settings"]],
  plan: [["plan"], ["subscription"]],
  credits: [["credits"]],
  usage: [["usage"]],
  notes: [["notes"]],
  quizzes: [["quizzes"]],
  stats: [["user-stats"]],
  dashboard: [["dashboard", "continue"]],
  rating: [["rating"], ["has-rated"]],
  admin: [["admin"]],
  chat: [["chat", "conversations"]],
} as const satisfies Record<string, readonly (readonly string[])[]>;

export type QueryGroup = keyof typeof queryGroups;

/** The cache policy for one family, spread straight into a `useQuery` call. */
export function family(name: QueryFamily): QueryFamilyPolicy {
  return queryFamilies[name];
}

/** Clear every key in every named group, so one write refreshes what it touched. */
export function invalidateGroups(
  client: Pick<QueryClient, "invalidateQueries">,
  ...groups: QueryGroup[]
): Promise<void> {
  const keys = groups.flatMap((group) =>
    queryGroups[group].map((key) => [...key]),
  );
  return Promise.all(
    keys.map((key) => client.invalidateQueries({ queryKey: key })),
  ).then(() => undefined);
}
