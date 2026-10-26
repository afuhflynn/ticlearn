import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shapes of the student surfaces that are still to arrive.
 *
 * Every skeleton mirrors the layout of the panel it stands in for, so nothing
 * moves when the content lands.
 */

/** The affiliate page: the balance card, the details form and the payouts. */
export function AffiliateSkeleton() {
  return (
    <div className="space-y-6" data-slot="affiliate-skeleton">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {placeholderKeys(3).map((key) => (
          <div key={key} className="space-y-2 rounded-xl border p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/** A single quiz attempt: the questions and the score. */
export function AttemptSkeleton() {
  return (
    <div className="space-y-6" data-slot="attempt-skeleton">
      <Skeleton className="h-9 w-64" />
      <div className="space-y-4 rounded-xl border p-6">
        {placeholderKeys(4).map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

/** The feedback page: the form and the past feedback list. */
export function FeedbackSkeleton() {
  return (
    <div className="space-y-6" data-slot="feedback-skeleton">
      <Skeleton className="h-9 w-48" />
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-40" />
        {placeholderKeys(3).map((key) => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

/** A single quiz: the questions and the answer options. */
export function QuizRunnerSkeleton() {
  return (
    <div className="space-y-6" data-slot="quiz-runner-skeleton">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-2/3" />
        <div className="space-y-2">
          {placeholderKeys(4).map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The settings page: the profile card, the password card and the side column. */
export function SettingsSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      data-slot="settings-skeleton"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="space-y-6 rounded-xl border p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-xl border p-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The subscription page: the plan card, the credits card and the usage card. */
export function SubscriptionSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-6"
      data-slot="subscription-skeleton"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 rounded-xl border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {placeholderKeys(4).map((key) => (
              <Skeleton key={key} className="h-4 w-40" />
            ))}
          </div>
        </div>

        <div className="space-y-5 rounded-xl border p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-44 max-w-full" />
          </div>
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      <div className="space-y-6 rounded-xl border p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        {placeholderKeys(3).map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
