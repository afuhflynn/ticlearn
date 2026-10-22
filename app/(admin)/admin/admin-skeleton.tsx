import { Skeleton } from "@/components/ui/skeleton";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * The shapes of the admin console, drawn while a panel is still arriving.
 *
 * The admin console follows the same standard as the student app. These
 * skeletons mirror the layout of the panels they stand in for, and they carry
 * no numbers, so nothing is read that the server has not sent.
 */

/** The stat card grid that opens the admin dashboard. */
export function AdminStatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-slot="admin-stat-cards-skeleton"
    >
      {placeholderKeys(count).map((key) => (
        <div key={key} className="rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The rows of an admin table, drawn while the table is arriving. */
export function AdminTableSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2" data-slot="admin-table-skeleton">
      {placeholderKeys(count).map((key) => (
        <Skeleton key={key} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** A detail panel that opens beside a list. */
export function AdminDetailPanelSkeleton() {
  return (
    <div className="space-y-4" data-slot="admin-detail-panel-skeleton">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

/** A settings form, drawn while the settings are arriving. */
export function AdminSettingsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6" data-slot="admin-settings-skeleton">
      {placeholderKeys(fields).map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/** The admin dashboard while it is still arriving. */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" data-slot="admin-dashboard-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-72" />
      </div>
      <AdminStatCardsSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        {placeholderKeys(4).map((key) => (
          <div key={key} className="space-y-3 rounded-xl border p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}
