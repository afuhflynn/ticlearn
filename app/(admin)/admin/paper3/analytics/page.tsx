"use client";

import { useSession } from "@/lib/auth-client";
import { BarChart3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = {
  mockId: string;
  title: string;
  status: string;
  subject: string;
  catalogVisible: boolean;
  module: { id: string; title: string } | null;
  attemptsStarted: number;
  attemptsCompleted: number;
  avgScoreCompleted: number | null;
  completionRate: number | null;
};

export default function Paper3MockAnalyticsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/admin/paper3/mocks/analytics")
      .then((r) => r.json())
      .then((d) => setRows(d.mocks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Paper 3 mock analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Starts vs completions, average score on completed attempts, and
          completion rate per mock.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Aggregated from mock attempts.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Mock</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Starts</th>
                <th className="pb-2 pr-4">Completed</th>
                <th className="pb-2 pr-4">Avg score</th>
                <th className="pb-2">Completion %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.mockId} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{r.title}</td>
                  <td className="py-3 pr-4 uppercase text-xs">{r.status}</td>
                  <td className="py-3 pr-4">{r.attemptsStarted}</td>
                  <td className="py-3 pr-4">{r.attemptsCompleted}</td>
                  <td className="py-3 pr-4">
                    {r.avgScoreCompleted != null
                      ? r.avgScoreCompleted
                      : "—"}
                  </td>
                  <td className="py-3">
                    {r.completionRate != null ? `${r.completionRate}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No mocks yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
