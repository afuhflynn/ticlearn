"use client";

import { FileText, ListTodo, Plus, TrendingUp, Zap, Clock, Target, Brain } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useNotes, useQuizzes, useUserStats } from "@/hooks";
import { useSession } from "@/lib/auth-client";

interface ProfileData {
  examLevel: string;
  program: string;
  examYear: number | null;
  daysRemaining: number | null;
  isRetaking: boolean;
  studyHoursPerWeek: number | null;
  readiness: number;
  weakestTopic: string | null;
  needsAssessment: boolean;
}

export default function DashboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { stats, isLoading: statsLoading } = useUserStats();
  const { notes, isLoading: notesLoading } = useNotes();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes("my");

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/readiness")
      .then((r) => r.json())
      .then((data) => {
        fetch("/api/profile")
          .then((r) => r.json())
          .then((p) => {
            setProfile({
              examLevel: p.examLevel ?? "",
              program: p.program ?? "",
              examYear: p.examYear ?? null,
              daysRemaining: p.daysRemaining ?? null,
              isRetaking: p.isRetaking ?? false,
              studyHoursPerWeek: p.studyHoursPerWeek ?? null,
              readiness: data.readiness ?? 50,
              weakestTopic: data.weakestTopic ?? null,
              needsAssessment: data.needsAssessment ?? true,
            });
            setProfileLoading(false);
          })
          .catch(() => setProfileLoading(false));
      })
      .catch(() => setProfileLoading(false));
  }, []);

  if (sessionPending || statsLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
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

  const profileCard = profile ? (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{profile.program}</CardTitle>
            <CardDescription>{profile.examLevel}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-lg font-bold ${
                profile.readiness >= 70
                  ? "border-green-500 text-green-600"
                  : profile.readiness >= 40
                    ? "border-yellow-500 text-yellow-600"
                    : "border-red-500 text-red-600"
              }`}
            >
              {profile.readiness}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {profile.daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{profile.daysRemaining}</strong> days until exam
              </span>
            </div>
          )}
          {profile.examYear && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>Year: {profile.examYear}</span>
            </div>
          )}
          {profile.isRetaking && (
            <Badge variant="secondary">Retaking</Badge>
          )}
          {profile.studyHoursPerWeek && (
            <span className="text-sm text-muted-foreground">
              {profile.studyHoursPerWeek}h/week study
            </span>
          )}
        </div>
        {profile.weakestTopic && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-orange-500" />
            <span>
              Focus: <strong>{profile.weakestTopic}</strong>
            </span>
          </div>
        )}
        {profile.needsAssessment && (
          <div className="mt-3">
            <Link href="/onboarding">
              <Button variant="outline" size="sm">
                Complete assessment to improve accuracy
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  ) : null;

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
      value: stats?.avgScore ? `${Math.round(stats.avgScore)}%` : "0%",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {session.user.name?.split(" ")[0] || "Student"}!</h1>
          {profile && <p className="text-muted-foreground">{profile.program} · {profile.examLevel}</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Upload Notes
            </Button>
          </Link>
        </div>
      </div>

      {profileCard}

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

      {/* Recent Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>Your latest uploaded study materials.</CardDescription>
          </div>
          <Link href="/upload">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Note
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {notesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.slice(0, 4).map((note) => (
                <div key={note.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{note.title}</p>
                      <p className="text-sm text-muted-foreground">{note.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={note.status === "READY" ? "default" : "secondary"}>
                      {note.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No notes yet.</p>
              <Link href="/upload">
                <Button variant="link">Upload your first note</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Quizzes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>Your latest quiz attempts.</CardDescription>
          </div>
          <Link href="/quizzes">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {quizzesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : quizzes && quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.slice(0, 4).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-sm text-muted-foreground">{quiz.questionCount} questions</p>
                  </div>
                  <Link href={`/quizzes/${quiz.id}`}>
                    <Button size="sm" variant="outline">Start</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No quizzes yet.</p>
              <Link href="/upload">
                <Button variant="link">Upload a note to generate quizzes</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
