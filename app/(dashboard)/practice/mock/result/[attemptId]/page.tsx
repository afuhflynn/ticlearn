"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, BarChart3, Home } from "lucide-react";

export default function MockResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const score = Number(searchParams.get("score") || 0);
  const total = Number(searchParams.get("total") || 0);
  const pct = Number(searchParams.get("pct") || 0);

  const gradeColor = pct >= 70 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500";
  const gradeLabel = pct >= 70 ? "Excellent!" : pct >= 40 ? "Good Effort" : "Needs Improvement";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Mock Exam Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className={`text-6xl font-bold ${gradeColor}`}>
              {pct}%
            </div>
            <p className="text-xl font-medium">{gradeLabel}</p>
            <p className="text-muted-foreground">
              {score} / {total} marks
            </p>
          </div>

          <Progress value={pct} className="h-3" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{Math.round(pct * 10) / 10}%</p>
              <p className="text-muted-foreground">Score</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{score}/{total}</p>
              <p className="text-muted-foreground">Marks</p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/practice/mock")}>
              <BarChart3 className="mr-2 h-4 w-4" /> Try Another Mock
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
