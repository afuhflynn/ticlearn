import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getDashboardNotes,
  getDashboardQuizzes,
  getDashboardReadiness,
  getDashboardStats,
} from "@/lib/dashboard-data";
import { queryKeys } from "@/lib/query-keys";
import { DashboardClient } from "./dashboard-client";

/**
 * The dashboard paints on the server and hands the data to the client cache, so
 * a student sees real numbers on the first paint instead of a round trip. This
 * is the pattern the other student surfaces copy, from spec 0010 slice two.
 *
 * Each read here calls the same function its API route calls, so a prefetched
 * value and a fetched value are the same shape rather than two copies that
 * happen to agree today.
 */
export default async function DashboardPage() {
  // `proxy.ts` owns the redirect: an unauthenticated request never reaches
  // this page. The session is still read here, because the prefetch needs the
  // user id. What must not live outside the proxy is a redirect.
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;
  const userName = session.user.name ?? "Student";
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.userStats,
      queryFn: () => getDashboardStats(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.notes,
      queryFn: () => getDashboardNotes(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.quizzes, "my", null],
      queryFn: () => getDashboardQuizzes(userId, "my"),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.readiness,
      queryFn: () => getDashboardReadiness(userId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient userName={userName} />
    </HydrationBoundary>
  );
}
