"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePaper3MyAttempts, useStartPaper3MockExam } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PracticeHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const startExam = useStartPaper3MockExam();
  const { data, isLoading } = usePaper3MyAttempts(page, 10);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (score: number) => {
    if (score >= 60) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" /> Pass
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <XCircle className="h-3 w-3" /> Try Again
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const grouped = (data as any)?.grouped || [];
  const attempts = (data as any)?.attempts || [];
  const totalPages = (data as any)?.totalPages || 1;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Exam History</h1>
        <p className="text-gray-500">
          View your past exam attempts and results
        </p>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No exam attempts yet</p>
            <Link href="/practice">
              <Button className="mt-4">Start Practicing</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((mockGroup: any) => (
            <Card key={mockGroup.mockId}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {mockGroup.mockTitle}
                  </CardTitle>
                  <span className="text-xs text-gray-500">
                    {mockGroup.mockSubject}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockGroup.attempts
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.completedAt).getTime() -
                        new Date(a.completedAt).getTime(),
                    )
                    .map((attempt: any, index: number) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-500">
                            Attempt {mockGroup.attempts.length - index}
                          </span>
                          <span
                            className={`text-lg font-bold ${getScoreColor(attempt.score)}`}
                          >
                            {Math.round(attempt.score)}%
                          </span>
                          {getStatusBadge(attempt.score)}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(attempt.completedAt)}
                          </span>
                          <div className="flex gap-2">
                            <Link href={`/practice/exam/result/${attempt.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await startExam.mutateAsync({
                                    mockId: mockGroup.mockId,
                                  });
                                  if (res.attempt) {
                                    router.push(
                                      `/practice/exam/${mockGroup.mockId}`,
                                    );
                                  }
                                } catch (error) {
                                  console.error("Failed to start exam:", error);
                                }
                              }}
                              disabled={startExam.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="py-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
