import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shape of a leaderboard row, drawn while the rankings are still
 * arriving.
 *
 * It mirrors the real row: the rank, the avatar, the name and the streak
 * line, and the points on the right. Nothing moves when the rows land.
 */
export function LeaderboardRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border p-4"
      data-slot="leaderboard-row-skeleton"
    >
      <Skeleton className="h-5 w-5" />
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <Skeleton className="ml-auto h-5 w-12" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
    </div>
  );
}

/** The list of leaderboard rows. */
export function LeaderboardListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" data-slot="leaderboard-list-skeleton">
      {placeholderKeys(count).map((key) => (
        <LeaderboardRowSkeleton key={key} />
      ))}
    </div>
  );
}
