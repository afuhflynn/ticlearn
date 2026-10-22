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
    <div className="rounded-xl border p-6" data-slot="quiz-card-skeleton">
      <div className="flex items-start justify-between gap-2">
        <div className="w-full space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20 shrink-0 rounded-md" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
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
