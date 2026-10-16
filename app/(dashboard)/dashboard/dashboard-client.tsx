"use client";

import {
  BotMessageSquare,
  Brain,
  FileText,
  ListTodo,
  Plus,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotes, useQuizzes, useReadiness, useUserStats } from "@/hooks";

export function DashboardClient({ userName }: { userName: string }) {
  const { stats, isLoading: statsLoading } = useUserStats();
  const { notes, isLoading: notesLoading } = useNotes();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes("my");

  const { readiness, isLoading: readinessLoading } = useReadiness();

  // The greeting arrives as a prop from the server render, which already knows
  // who is signed in. Reading the session here would be a client only value, so
  // this branch would be true during the server pass and the first paint would
  // be four skeletons instead of the numbers the server already fetched.
  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Notes",
      value: stats?.totalNotes || 0,
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Quizzes Taken",
      value: stats?.quizzesTaken || 0,
      icon: ListTodo,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Avg Score",
      value: stats && stats.avgScore ? `${Math.round(stats.avgScore)}%` : "0%",
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Current Streak",
      value: stats ? `${stats.currentStreak || 0}d` : "0d",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  function renderNotesContent(loading: boolean, data: typeof notes) {
    if (loading) return <Skeleton className="h-32" />;
    if (data && data.length > 0) {
      return (
        <div className="space-y-3">
          {data.slice(0, 4).map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.subject}</p>
                </div>
              </div>
              <Badge variant={n.status === "READY" ? "default" : "secondary"}>
                {n.status}
              </Badge>
            </div>
          ))}
        </div>
      );
    }
    return (
      <p className="text-muted-foreground py-8 text-center">No notes yet.</p>
    );
  }

  function renderQuizContent(loading: boolean, data: typeof quizzes) {
    if (loading) return <Skeleton className="h-32" />;
    if (data && data.length > 0) {
      return (
        <div className="space-y-3">
          {data.slice(0, 4).map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{q.title}</p>
                <p className="text-sm text-muted-foreground">
                  {q.questionCount} questions
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/quiz/${q.id}`}>Start</Link>
              </Button>
            </div>
          ))}
        </div>
      );
    }
    return (
      <p className="text-muted-foreground py-8 text-center">No quizzes yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Welcome back, {userName.split(" ")[0] || "Student"}!
        </h1>
        <Button asChild>
          <Link href="/upload">
            <Plus className="mr-2 h-4 w-4" /> Upload
          </Link>
        </Button>
      </div>

      {readiness && !readiness.needsAssessment && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full border-4 text-2xl font-bold
                  ${readiness.readiness >= 70 ? "border-green-500 text-green-600" : readiness.readiness >= 40 ? "border-yellow-500 text-yellow-600" : "border-red-500 text-red-600"}`}
                >
                  {readiness.readiness}%
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  Readiness
                </span>
              </div>

              <div className="flex-1 space-y-3 min-w-[200px]">
                {readiness.topicReadiness.slice(0, 5).map((t) => (
                  <div key={t.topic} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t.topic}</span>
                      <span className="font-mono">{t.score}%</span>
                    </div>
                    <Progress value={t.score} className="h-2" />
                  </div>
                ))}

                {readiness.weakestTopic && (
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-orange-500" />
                    <span>
                      Weakest: <strong>{readiness.weakestTopic.name}</strong> (
                      {readiness.weakestTopic.score}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {readiness.recommendations.length > 0 && (
              <div className="mt-4 space-y-1 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Recommendations
                </p>
                {readiness.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick actions</CardTitle>
          <CardDescription>
            Chat with Tip, upload notes, practise with quizzes, leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 py-4 text-left whitespace-normal shadow-none"
            asChild
          >
            <Link href="/chat">
              <BotMessageSquare className="h-5 w-5 text-primary" />
              <span className="font-semibold leading-tight">Ask Tip</span>
              <span className="text-muted-foreground text-xs font-normal">
                Get explanations anytime.
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 py-4 text-left whitespace-normal shadow-none"
            asChild
          >
            <Link href="/leaderboard">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold leading-tight">Leaderboard</span>
              <span className="text-muted-foreground text-xs font-normal">
                Compare quiz scores with peers.
              </span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {readinessLoading && <Skeleton className="h-48" />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>Latest study materials</CardDescription>
          </CardHeader>
          <CardContent>{renderNotesContent(notesLoading, notes)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>Latest attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {renderQuizContent(quizzesLoading, quizzes)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
