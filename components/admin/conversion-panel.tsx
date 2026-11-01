"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export function ConversionPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.adminConversion,
    queryFn: () => api.queries.conversion(),
    ...family("admin"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Reading the funnel.</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The funnel did not load. Study keeps working.
          </p>
        </CardContent>
      </Card>
    );
  }

  const rows: Array<[string, number]> = [
    ["Limit hit", data.byEvent.limit_hit ?? 0],
    ["Invite shown", data.byEvent.prompt_shown ?? 0],
    ["Invite clicked", data.byEvent.prompt_clicked ?? 0],
    ["Invite dismissed", data.byEvent.prompt_dismissed ?? 0],
    ["Upgrade started", data.byEvent.upgrade_start ?? 0],
    ["Paid now", data.paid ?? 0],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion, last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
