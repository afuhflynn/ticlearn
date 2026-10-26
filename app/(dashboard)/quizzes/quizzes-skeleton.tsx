import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shape of a quiz card, drawn while the list is still arriving.
 *
 * It mirrors the real card: a title and a note title in the header, the
 * question count and the two buttons in the body. Nothing moves when the
 * cards land.
 */
export function QuizCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col gap-4 rounded-xl border p-4"
      data-slot="quiz-card-skeleton"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

/** The list of quiz cards, in the grid they sit in. */
export function QuizListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-slot="quiz-list-skeleton"
    >
      {placeholderKeys(count).map((key) => (
        <QuizCardSkeleton key={key} />
      ))}
    </div>
  );
}
