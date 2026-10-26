import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shape of a note card, drawn while the notes are still arriving.
 *
 * It mirrors the real card in the grid: the file icon, the title and the quiz
 * count, the status badge, the summary lines and the two buttons at the foot.
 * The outline is the card's own, so nothing moves when the note lands.
 */
export function NoteCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col gap-4 rounded-xl border p-4"
      data-slot="note-card-skeleton"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>

      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}

/** The grid the notes land in, at the same three columns on a wide screen. */
export function NoteListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      data-slot="note-list-skeleton"
    >
      {placeholderKeys(count).map((key) => (
        <NoteCardSkeleton key={key} />
      ))}
    </div>
  );
}

/**
 * The whole page while the session resolves: the title, the upload card beside
 * the stages card, and the note grid under them.
 */
export function UploadPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-8"
      data-slot="upload-page-skeleton"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5 rounded-xl border p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <Skeleton className="h-5 w-36" />
          {placeholderKeys(3).map((key) => (
            <div key={key} className="flex gap-3">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <NoteListSkeleton count={3} />
      </div>
    </div>
  );
}
