import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shapes of the dashboard, drawn while the dashboard is still arriving.
 *
 * Every skeleton here mirrors the layout of the real thing it stands in for,
 * so nothing moves when the content lands. A skeleton that lies about the
 * shape of the content is a defect, not a rough edge.
 */

/** One of the four stat cards. The icon block, the label, the number. */
export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-6" data-slot="stat-card-skeleton">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

/** The four stat cards, in the grid they sit in. */
export function StatCardsSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-slot="stat-cards-skeleton"
    >
      {placeholderKeys(4).map((key) => (
        <StatCardSkeleton key={key} />
      ))}
    </div>
  );
}

/** The readiness card. The ring on the left, five topic rows on the right. */
export function ReadinessCardSkeleton() {
  return (
    <div
      className="flex flex-wrap items-start gap-6 p-6"
      data-slot="readiness-card-skeleton"
    >
      <div className="flex flex-col items-center">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="mt-2 h-3 w-16" />
      </div>
      <div className="min-w-[200px] flex-1 space-y-3">
        {placeholderKeys(5).map((key) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

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

/** The recent notes card body. */
export function NotesCardSkeleton() {
  return (
    <div className="space-y-3" data-slot="notes-card-skeleton">
      {placeholderKeys(4).map((key) => (
        <NoteRowSkeleton key={key} />
      ))}
    </div>
  );
}

/** One row of the recent quizzes card. Two lines and the start button. */
export function QuizRowSkeleton() {
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-3"
      data-slot="quiz-row-skeleton"
    >
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  );
}

/** The recent quizzes card body. */
export function QuizzesCardSkeleton() {
  return (
    <div className="space-y-3" data-slot="quizzes-card-skeleton">
      {placeholderKeys(4).map((key) => (
        <QuizRowSkeleton key={key} />
      ))}
    </div>
  );
}
