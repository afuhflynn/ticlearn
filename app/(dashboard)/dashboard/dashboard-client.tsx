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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PendingRegion } from "@/components/ui/pending-region";
import { Progress } from "@/components/ui/progress";
import { useNotes, useQuizzes, useReadiness, useUserStats } from "@/hooks";
import {
  NotesCardSkeleton,
  QuizzesCardSkeleton,
  ReadinessCardSkeleton,
  StatCardsSkeleton,
} from "./dashboard-skeletons";

const DASHBOARD_LONG_WAIT =
  "Still loading your dashboard. This normally takes a moment.";

export function DashboardClient({ userName }: { userName: string }) {
  const {
    stats,
    isPending: statsPending,
    isRefreshing: statsRefreshing,
  } = useUserStats();
  const {
    notes,
    isPending: notesPending,
    isRefreshing: notesRefreshing,
  } = useNotes();
  const {
    quizzes,
    isPending: quizzesPending,
    isRefreshing: quizzesRefreshing,
  } = useQuizzes("my");
  const { readiness, isPending: readinessPending } = useReadiness();

  const statsData = [
    {
      title: "Total Notes",
      value: stats?.totalNotes || 0,
      icon: FileText,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      title: "Quizzes Taken",
      value: stats?.quizzesTaken || 0,
      icon: ListTodo,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      title: "Avg Score",
      value: stats?.avgScore ? `${Math.round(stats.avgScore)}%` : "0%",
      icon: TrendingUp,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      title: "Current Streak",
      value: stats ? `${stats.currentStreak || 0}d` : "0d",
      icon: Zap,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
  ];

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

      <PendingRegion
        fallback={<ReadinessCardSkeleton />}
        isPending={readinessPending}
        label="Your readiness"
        longWaitMessage={DASHBOARD_LONG_WAIT}
      >
        {readiness && !readiness.needsAssessment ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full border-4 text-2xl font-bold
                    ${readiness.readiness >= 70 ? "border-chart-1 text-chart-1" : readiness.readiness >= 40 ? "border-chart-3 text-chart-3" : "border-destructive text-destructive"}`}
                  >
                    {readiness.readiness}%
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Readiness
                  </span>
                </div>

                <div className="min-w-[200px] flex-1 space-y-3">
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
                      <Brain className="h-4 w-4 text-chart-3" />
                      <span>
                        Weakest: <strong>{readiness.weakestTopic.name}</strong>{" "}
                        ({readiness.weakestTopic.score}%)
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
                  {readiness.recommendations.map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </PendingRegion>

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

      <PendingRegion
        fallback={<StatCardsSkeleton />}
        isPending={statsPending}
        isRefreshing={statsRefreshing}
        label="Your statistics"
        longWaitMessage={DASHBOARD_LONG_WAIT}
      >
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
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PendingRegion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>Latest study materials</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingRegion
              fallback={<NotesCardSkeleton />}
              isPending={notesPending}
              isRefreshing={notesRefreshing}
              label="Your recent notes"
              longWaitMessage={DASHBOARD_LONG_WAIT}
            >
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {n.subject}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={n.status === "READY" ? "default" : "secondary"}
                      >
                        {n.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No notes yet</EmptyTitle>
                    <EmptyDescription>
                      Upload a lecture note and it will show up here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/upload">Upload a note</Link>
                  </Button>
                </Empty>
              )}
            </PendingRegion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>Latest attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingRegion
              fallback={<QuizzesCardSkeleton />}
              isPending={quizzesPending}
              isRefreshing={quizzesRefreshing}
              label="Your recent quizzes"
              longWaitMessage={DASHBOARD_LONG_WAIT}
            >
              {quizzes.length > 0 ? (
                <div className="space-y-3">
                  {quizzes.slice(0, 4).map((q) => (
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
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListTodo className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No quizzes yet</EmptyTitle>
                    <EmptyDescription>
                      Make a quiz from one of your notes to start practising.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </PendingRegion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
