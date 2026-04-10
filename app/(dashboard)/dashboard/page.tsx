"use client";

import { FileText, ListTodo, Plus, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { useNotes, useQuizzes, useUserStats } from "@/hooks";
import { useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { stats, isLoading: statsLoading } = useUserStats();
  const { notes, isLoading: notesLoading } = useNotes();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes("my");

  if (sessionPending || statsLoading) {
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

  if (!session) {
    redirect("/sign-in");
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
      value: `${Math.round(stats?.avgScore || 0)}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Current Streak",
      value: `${stats?.currentStreak || 0} days`,
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  const recentNotes = notes
    .slice(0, 4)
    .map((note: { id: string; title: string; subject: string }) => ({
      id: note.id,
      title: note.title,
      subject: note.subject,
    }));

  const recentQuizzes = quizzes
    .slice(0, 4)
    .map((quiz: { id: string; title: string; questionCount: number }) => ({
      id: quiz.id,
      title: quiz.title,
      questionCount: quiz.questionCount,
    }));

  const hasNotes = recentNotes.length > 0;
  const hasQuizzes = recentQuizzes.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session.user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Notes
            </Link>
          </Button>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Notes</CardTitle>
              <CardDescription>Your latest uploaded notes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/upload">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : hasNotes ? (
              <div className="space-y-4">
                {recentNotes.map(
                  (note: { id: string; title: string; subject: string }) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{note.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {note.subject}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="rounded-full bg-muted p-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first note to get started
                  </p>
                </div>
                <Button asChild>
                  <Link href="/upload">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Notes
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your latest quizzes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/quizzes">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {quizzesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : hasQuizzes ? (
              <div className="space-y-4">
                {recentQuizzes.map(
                  (quiz: {
                    id: string;
                    title: string;
                    questionCount: number;
                  }) => (
                    <div
                      key={quiz.id}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <ListTodo className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{quiz.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {quiz.questionCount} questions
                        </p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/quiz/${quiz.id}`}>Start</Link>
                      </Button>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="rounded-full bg-muted p-4">
                  <ListTodo className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No quizzes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a quiz from your notes
                  </p>
                </div>
                <Button asChild>
                  <Link href="/upload">
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Quiz
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Your learning activity this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Study Time</span>
              <span className="text-sm font-medium">
                {stats?.totalNotes || 0} notes / 10 goal
              </span>
            </div>
            <Progress
              value={((stats?.totalNotes || 0) / 10) * 100}
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm">Quizzes Completed</span>
              <span className="text-sm font-medium">
                {stats?.quizzesTaken || 0} / 5
              </span>
            </div>
            <Progress
              value={((stats?.quizzesTaken || 0) / 5) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
