import { Skeleton } from "@/components/ui/skeleton";
import {
  NotesCardSkeleton,
  QuizzesCardSkeleton,
  ReadinessCardSkeleton,
  StatCardsSkeleton,
} from "./dashboard-skeletons";

/**
 * The dashboard while the server is still putting it together.
 *
 * This is the only route level loading file in the app, and it is here for a
 * reason: the dashboard is the one page that waits on the server during the
 * render, because it prefetches the student's own numbers so the first paint
 * shows real content. Everything else fetches after the page has painted, and
 * a route level file there would flash.
 *
 * The blocks below mirror the dashboard, so nothing moves when the real
 * content lands.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" data-slot="dashboard-loading">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="rounded-xl border p-6">
        <ReadinessCardSkeleton />
      </div>

      <StatCardsSkeleton />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-6">
          <NotesCardSkeleton />
        </div>
        <div className="rounded-xl border p-6">
          <QuizzesCardSkeleton />
        </div>
      </div>
    </div>
  );
}
