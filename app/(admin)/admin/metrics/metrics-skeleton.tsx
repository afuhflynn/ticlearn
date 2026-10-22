import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shapes of the seven admin metrics panels, drawn while a panel is still
 * arriving.
 *
 * Every panel has a skeleton that matches its own shape, so an admin moving
 * between tabs sees the panel they are about to read rather than a blank
 * space. The blocks carry no numbers, so nothing is read that the server has
 * not sent.
 */

/** A panel that is one chart card. */
function ChartCardSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-xl border p-6">
      <Skeleton className="h-5 w-56" />
      <Skeleton className={`mt-6 w-full ${height}`} />
    </div>
  );
}

/** A panel that is a row of number cards. */
function StatCardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {placeholderKeys(count).map((key) => (
        <div key={key} className="rounded-xl border p-4 text-center">
          <Skeleton className="mx-auto h-4 w-24" />
          <Skeleton className="mx-auto mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Overview: a metric chart, a daily active trend and a revenue trend. */
export function OverviewPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="overview-panel-skeleton">
      <ChartCardSkeleton />
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-72" />
      </div>
    </div>
  );
}

/** Engagement: active users, actions per day, quiz activity, subjects. */
export function EngagementPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="engagement-panel-skeleton">
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-72" />
      </div>
    </div>
  );
}

/** Learning: four mastery numbers and the practice questions chart. */
export function LearningPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="learning-panel-skeleton">
      <StatCardsSkeleton count={4} />
      <ChartCardSkeleton height="h-72" />
    </div>
  );
}

/** Growth: three numbers, the new users chart and the activation funnel. */
export function GrowthPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="growth-panel-skeleton">
      <div className="grid gap-4 md:grid-cols-3">
        {placeholderKeys(3).map((key) => (
          <div key={key} className="rounded-xl border p-4 text-center">
            <Skeleton className="mx-auto h-4 w-24" />
            <Skeleton className="mx-auto mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <ChartCardSkeleton height="h-72" />
    </div>
  );
}

/** Monetization: four numbers, revenue over time, MRR by plan, signals. */
export function MonetizationPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="monetization-panel-skeleton">
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-72" />
      </div>
    </div>
  );
}

/** Retention: the cohort chart and the silent churn list. */
export function RetentionPanelSkeleton() {
  return (
    <div className="space-y-6" data-slot="retention-panel-skeleton">
      <ChartCardSkeleton height="h-[300px]" />
      <div className="rounded-xl border p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          {placeholderKeys(4).map((key) => (
            <Skeleton key={key} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Data: the raw metrics table with its search and filter row. */
export function DataTableSkeleton() {
  return (
    <div className="space-y-2" data-slot="data-table-skeleton">
      {placeholderKeys(10).map((key) => (
        <Skeleton key={key} className="h-9 w-full" />
      ))}
    </div>
  );
}
