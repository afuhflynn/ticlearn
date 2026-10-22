import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shape of a note card, drawn while the notes are still arriving.
 *
 * It mirrors the real card: the file icon, the title and the status badge,
 * the summary lines, and the row of buttons.
 */
export function NoteCardSkeleton() {
  return (
    <div
      className="space-y-4 rounded-xl border p-4"
      data-slot="note-card-skeleton"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-4 w-2/3 max-w-3xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** The list of note cards. */
export function NoteListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" data-slot="note-list-skeleton">
      {placeholderKeys(count).map((key) => (
        <NoteCardSkeleton key={key} />
      ))}
    </div>
  );
}
