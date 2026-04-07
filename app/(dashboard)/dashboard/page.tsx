"use client";

import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ListTodo,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Plus,
  Zap,
} from "lucide-react";
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

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
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

  const stats = [
    {
      title: "Total Notes",
      value: "0",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Quizzes Taken",
      value: "0",
      icon: ListTodo,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Avg Score",
      value: "0%",
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Current Streak",
      value: "0 days",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  const recentNotes: { id: string; title: string; subject: string }[] = [];
  const recentQuizzes: { id: string; title: string; questionCount: number }[] =
    [];

  const hasNotes = recentNotes.length > 0;
  const hasQuizzes = recentQuizzes.length > 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
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

      {/* Free Plan Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">Upgrade to Premium</h3>
              <p className="text-sm text-muted-foreground">
                Unlock unlimited notes, quizzes, and access to GCE exams
              </p>
            </div>
            <Button asChild>
              <Link href="/pricing">
                View Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Notes */}
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
            {hasNotes ? (
              <div className="space-y-4">
                {recentNotes.slice(0, 4).map((note) => (
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
                ))}
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

        {/* Recent Quizzes */}
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
            {hasQuizzes ? (
              <div className="space-y-4">
                {recentQuizzes.slice(0, 4).map((quiz) => (
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
                    <Button size="sm">Start</Button>
                  </div>
                ))}
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

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Your learning activity this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Study Time</span>
              <span className="text-sm font-medium">0 min / 60 min</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm">Quizzes Completed</span>
              <span className="text-sm font-medium">0 / 5</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
