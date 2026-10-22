import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shape of a community post, drawn while the posts are still arriving.
 *
 * It mirrors the real post: the avatar, the name and the date, and the body
 * of the message. The blocks carry no names, no scores and no avatars, so a
 * student never sees another student's data before the server sends it.
 */
export function CommunityPostSkeleton() {
  return (
    <div className="rounded-xl border p-6" data-slot="community-post-skeleton">
      <div className="flex items-start gap-4">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

/** The list of community posts. */
export function CommunityPostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" data-slot="community-post-list-skeleton">
      {placeholderKeys(count).map((key) => (
        <CommunityPostSkeleton key={key} />
      ))}
    </div>
  );
}

/** The shape of a public quiz card. */
export function PublicQuizCardSkeleton() {
  return (
    <div
      className="rounded-xl border p-6"
      data-slot="public-quiz-card-skeleton"
    >
      <Skeleton className="h-5 w-3/4" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

/** The grid of public quiz cards. */
export function PublicQuizGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      data-slot="public-quiz-grid-skeleton"
    >
      {placeholderKeys(count).map((key) => (
        <PublicQuizCardSkeleton key={key} />
      ))}
    </div>
  );
}
