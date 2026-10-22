import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of a note, drawn while the note is still arriving.
 *
 * The title, the badge, the summary and the two panels. Nothing moves when
 * the note lands.
 */
export function NoteDetailSkeleton() {
  return (
    <div className="space-y-6" data-slot="note-detail-skeleton">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full space-y-3">
          <Skeleton className="h-9 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[720px] w-full rounded-xl" />
        <Skeleton className="h-[720px] w-full rounded-xl" />
      </div>
    </div>
  );
}
