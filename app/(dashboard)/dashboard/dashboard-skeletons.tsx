import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shapes of the dashboard, drawn while it is still arriving.
 *
 * Every skeleton here mirrors the layout of the real thing it stands in for,
 * so nothing moves when the content lands. A skeleton that lies about the
 * shape of the content is a defect, not a rough edge.
 */

/** One row of the recent notes card. The icon, two lines, the badge. */
export function NoteRowSkeleton() {
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-3"
      data-slot="note-row-skeleton"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-md" />
    </div>
  );
}

/** One continue card: a title line, a subtitle line and the one row. */
export function ContinueCardSkeleton() {
  return (
    <div className="rounded-xl border p-6" data-slot="continue-card-skeleton">
      <div className="space-y-2 pb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <NoteRowSkeleton />
    </div>
  );
}

/** The three continue cards, in the grid they sit in. */
export function DashboardContinueSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-3"
      data-slot="dashboard-continue-skeleton"
    >
      {placeholderKeys(3).map((key) => (
        <ContinueCardSkeleton key={key} />
      ))}
    </div>
  );
}
