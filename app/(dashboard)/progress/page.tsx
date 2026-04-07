"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Plus,
  ArrowRight,
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

export default function ProgressPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) return null;
  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const stats = [
    {
      title: "Total Attempts",
      value: "0",
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Average Score",
      value: "0%",
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Best Score",
      value: "0%",
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Pass Rate",
      value: "0%",
      icon: Award,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  const recentAttempts: {
    id: string;
    quizTitle: string;
    completedAt: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
  }[] = [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          Track your learning progress and performance
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Weekly Goal</CardTitle>
          <CardDescription>Complete 5 quizzes this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Progress</span>
              <span className="text-sm font-medium">0 / 5</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttempts.length > 0 ? (
            <div className="space-y-4">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{attempt.quizTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {attempt.completedAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{attempt.score}%</p>
                    <p className="text-sm text-muted-foreground">
                      {attempt.correctAnswers}/{attempt.totalQuestions} correct
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No attempts yet</p>
                <p className="text-sm text-muted-foreground">
                  Take your first quiz to start tracking progress
                </p>
              </div>
              <Button asChild>
                <Link href="/quizzes">
                  <Plus className="mr-2 h-4 w-4" />
                  Take a Quiz
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
