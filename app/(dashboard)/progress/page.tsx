"use client";

import { BarChart3, Plus, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PendingRegion } from "@/components/ui/pending-region";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentAttempts, useUserStats } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { placeholderKeys } from "@/lib/placeholder-keys";

export default function ProgressPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { stats, isPending: statsPending } = useUserStats();
  const { data: attemptsData, isPending: attemptsPending } =
    useRecentAttempts(5);

  if (isPending || statsPending || attemptsPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {placeholderKeys(4).map((key) => (
            <Skeleton key={key} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const userStats = stats || {
    totalAttempts: 0,
    avgScore: 0,
    quizzesTaken: 0,
    currentStreak: 0,
    totalPoints: 0,
    totalNotes: 0,
    totalQuizzes: 0,
  };

  const recentAttempts = (attemptsData?.attempts || []) as {
    id: string;
    quizTitle: string;
    completedAt: string | null;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
  }[];

  const bestScore =
    recentAttempts.length > 0
      ? Math.max(...recentAttempts.map((a) => a.score))
      : 0;

  const statsData = [
    {
      title: "Quizzes Taken",
      value: userStats.quizzesTaken.toString(),
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Average Score",
      value: `${Math.round(userStats.avgScore)}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Best Score",
      value: `${bestScore}%`,
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Current Streak",
      value: `${userStats.currentStreak} days`,
      icon: Target,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          Track your learning progress and performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingRegion
            fallback={
              <div className="space-y-4">
                {placeholderKeys(3).map((key) => (
                  <Skeleton key={key} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            }
            isPending={attemptsPending}
            label="Your recent attempts"
            longWaitMessage="Still loading your attempts. This normally takes a moment."
          >
            {recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/attempts/${attempt.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{attempt.quizTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {attempt.completedAt
                          ? new Date(attempt.completedAt).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{attempt.score}%</p>
                      <p className="text-sm text-muted-foreground">
                        {attempt.correctAnswers}/{attempt.totalQuestions}{" "}
                        correct
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty className="border-0 p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BarChart3 className="size-4 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>No attempts yet</EmptyTitle>
                  <EmptyDescription>
                    Take your first quiz to start tracking progress.
                  </EmptyDescription>
                </EmptyHeader>
                <Button asChild>
                  <Link href="/quizzes">
                    <Plus className="mr-2 h-4 w-4" />
                    Take a Quiz
                  </Link>
                </Button>
              </Empty>
            )}
          </PendingRegion>
        </CardContent>
      </Card>
    </div>
  );
}
