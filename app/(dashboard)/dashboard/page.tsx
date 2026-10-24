import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDashboardContinue } from "@/lib/dashboard-data";
import { queryKeys } from "@/lib/query-keys";
import { DashboardClient } from "./dashboard-client";

/**
 * The dashboard paints on the server and hands the data to the client cache, so
 * a student sees where they left off on the first paint instead of a round
 * trip. This is the pattern the other student surfaces copy, from spec 0010
 * slice two.
 *
 * One read, from spec 0014: recent notes, the last quiz touched, the last open
 * Tip conversation. No score, no chart, no readiness.
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

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboardContinue,
    queryFn: () => getDashboardContinue(userId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient userName={userName} />
    </HydrationBoundary>
  );
}
