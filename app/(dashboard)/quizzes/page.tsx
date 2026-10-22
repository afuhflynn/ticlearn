"use client";

import { ListTodo, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
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
import { PendingRegion, useLongWait } from "@/components/ui/pending-region";
import { ProgressLine } from "@/components/ui/process-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UrlSearchInput } from "@/components/url-search-input";
import { useDeleteQuiz, useQuizzes } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { correctionsForKeys } from "@/nuqs";
import { quizzesViewDefaults, quizzesViewParsers } from "@/nuqs/quizzes";
import { QuizListSkeleton } from "./quizzes-skeleton";

type QuizListItem = {
  id: string;
  title: string;
  noteTitle?: string;
  questionCount: number;
  status: "GENERATING" | "READY" | "ERROR";
};

/**
 * A quiz is one model call, so the honest indicator is a plain line with a
 * time estimate and not a stage list. The line only appears once the wait
 * passes ten seconds, measured on the client's own clock.
 */
function QuizGeneratingLine() {
  const isLongWait = useLongWait(true);
  if (!isLongWait) return null;
  return (
    <ProgressLine
      className="mt-3"
      message="Your quiz is still being written."
      estimate="It usually takes about a minute."
    />
  );
}

export default function QuizzesPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  // Search text lives in the URL, so refresh, back, forward, and
  // shared links reproduce the same filtered list.
  const [q, setQ] = useQueryState(
    "q",
    quizzesViewParsers.q.withOptions({ history: "replace" }),
  );
  const rawParams = useSearchParams();

  // A raw key that disagrees with the canonical value corrects
  // itself with replace history.
  useEffect(() => {
    const patch = correctionsForKeys(rawParams, { q }, quizzesViewDefaults);
    if (patch.q !== undefined && patch.q !== q) setQ(patch.q);
  }, [rawParams, q, setQ]);

  const { quizzes, isPending, isRefreshing, isError, isOffline, refetch } =
    useQuizzes("my");
  const deleteQuiz = useDeleteQuiz();

  const hasGeneratingQuiz = (quizzes as QuizListItem[])?.some(
    (q) => q.status === "GENERATING",
  );

  const prevQuizStatuses = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const newlyReadyQuiz = (quizzes as QuizListItem[])?.find((q) => {
      const prevStatus = prevQuizStatuses.current.get(q.id);
      return q.status === "READY" && prevStatus === "GENERATING";
    });

    if (newlyReadyQuiz) {
      router.push(`/quiz/${newlyReadyQuiz.id}`);
    }

    (quizzes as QuizListItem[])?.forEach((q) => {
      prevQuizStatuses.current.set(q.id, q.status);
    });
  }, [quizzes, router]);

  if (sessionPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        <QuizListSkeleton />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const filteredQuizzes = (quizzes as QuizListItem[]).filter(
    (quiz) =>
      quiz.title.toLowerCase().includes(q.toLowerCase()) ||
      quiz.noteTitle?.toLowerCase().includes(q.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      await deleteQuiz.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
            {hasGeneratingQuiz && (
              <span className="text-xs text-muted-foreground">Generating</span>
            )}
          </div>
          <p className="text-muted-foreground">
            View and manage your generated quizzes
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Plus className="mr-2 h-4 w-4" />
            Generate Quiz
          </Link>
        </Button>
      </div>

      <UrlSearchInput
        value={q}
        onCommit={setQ}
        placeholder="Search quizzes..."
        ariaLabel="Search quizzes"
      />

      <PendingRegion
        fallback={<QuizListSkeleton />}
        isError={isError}
        isOffline={isOffline}
        isPending={isPending}
        isRefreshing={isRefreshing}
        label="Your quizzes"
        longWaitMessage="Still loading your quizzes. This normally takes a moment."
        onRetry={() => void refetch()}
      >
        {filteredQuizzes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {quiz.noteTitle}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        quiz.status === "READY" ? "default" : "secondary"
                      }
                    >
                      {quiz.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {quiz.questionCount} questions
                    </span>
                    <div className="flex gap-2">
                      {quiz.status === "READY" ? (
                        <Button size="sm" asChild>
                          <Link href={`/quizzes/${quiz.id}`}>
                            <Play className="mr-1 h-4 w-4" />
                            Start
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" disabled>
                          Generating
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(quiz.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {quiz.status === "GENERATING" ? <QuizGeneratingLine /> : null}
                </CardContent>
              </Card>
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
                Generate your first quiz from uploaded notes.
              </EmptyDescription>
            </EmptyHeader>
            <Button asChild>
              <Link href="/upload">
                <Plus className="mr-2 h-4 w-4" />
                Generate Quiz
              </Link>
            </Button>
          </Empty>
        )}
      </PendingRegion>
    </div>
  );
}
