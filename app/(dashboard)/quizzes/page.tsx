"use client";

import { ListTodo, Play, Plus, SearchX, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
      message="Your quiz is still being written."
      estimate="It usually takes about a minute."
    />
  );
}

function statusLabel(status: QuizListItem["status"]) {
  if (status === "READY") return "Ready";
  if (status === "GENERATING") return "Writing";
  return "Failed";
}

export default function QuizzesPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();

  // Search text lives in the URL, so refresh, back, forward, and shared links
  // reproduce the same filtered list.
  const [q, setQ] = useQueryState(
    "q",
    quizzesViewParsers.q.withOptions({ history: "replace" }),
  );
  const rawParams = useSearchParams();

  // A raw key that disagrees with the canonical value corrects itself with
  // replace history.
  useEffect(() => {
    const patch = correctionsForKeys(rawParams, { q }, quizzesViewDefaults);
    if (patch.q !== undefined && patch.q !== q) setQ(patch.q);
  }, [rawParams, q, setQ]);

  const { quizzes, isPending, isRefreshing, isError, isOffline, refetch } =
    useQuizzes("my");
  const deleteQuiz = useDeleteQuiz();

  const list = quizzes as QuizListItem[];
  const isGenerating = list.some((quiz) => quiz.status === "GENERATING");

  const previousStatuses = useRef<Map<string, string>>(new Map());

  // A quiz that just finished jumps to its own page, because that is the
  // moment the student was waiting for.
  useEffect(() => {
    const justReady = list.find((quiz) => {
      const previous = previousStatuses.current.get(quiz.id);
      return quiz.status === "READY" && previous === "GENERATING";
    });

    if (justReady) {
      router.push(`/quizzes/${justReady.id}`);
    }

    for (const quiz of list) {
      previousStatuses.current.set(quiz.id, quiz.status);
    }
  }, [list, router]);

  if (sessionPending) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <QuizListSkeleton count={6} />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const term = q.trim().toLowerCase();
  const filtered = term
    ? list.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(term) ||
          quiz.noteTitle?.toLowerCase().includes(term),
      )
    : list;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">
            {list.length === 0
              ? "Quizzes you make from your notes will live here."
              : `${list.length} quiz${list.length === 1 ? "" : "zes"} from your notes${isGenerating ? " · one is being written" : ""}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Plus className="mr-2 size-4" />
            Make a quiz
          </Link>
        </Button>
      </div>

      <UrlSearchInput
        value={q}
        onCommit={setQ}
        placeholder="Search by title or note"
        ariaLabel="Search quizzes"
      />

      <PendingRegion
        fallback={<QuizListSkeleton count={6} />}
        isError={isError}
        isOffline={isOffline}
        isPending={isPending}
        isRefreshing={isRefreshing}
        label="Your quizzes"
        longWaitMessage="Still loading your quizzes. This normally takes a moment."
        onRetry={() => void refetch()}
      >
        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((quiz) => {
              const isReady = quiz.status === "READY";
              return (
                <Card key={quiz.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="line-clamp-2 text-base">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-1 text-xs">
                          {quiz.noteTitle || "No source note"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          isReady
                            ? "default"
                            : quiz.status === "ERROR"
                              ? "destructive"
                              : "secondary"
                        }
                        className="shrink-0"
                      >
                        {statusLabel(quiz.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {quiz.questionCount} question
                      {quiz.questionCount === 1 ? "" : "s"}
                    </p>
                    {quiz.status === "GENERATING" ? (
                      <QuizGeneratingLine />
                    ) : null}
                    {quiz.status === "ERROR" ? (
                      <p className="text-sm text-muted-foreground">
                        This quiz did not finish. Delete it and make a new one
                        from the note.
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="gap-2">
                    {isReady ? (
                      <Button size="sm" className="flex-1" asChild>
                        <Link href={`/quizzes/${quiz.id}`}>
                          <Play className="mr-2 size-4" />
                          Start
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled
                      >
                        {quiz.status === "GENERATING"
                          ? "Writing…"
                          : "Unavailable"}
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Delete {quiz.title}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            “{quiz.title}” and its attempts are removed. The
                            note it came from stays.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void deleteQuiz.mutateAsync(quiz.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : term ? (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX className="size-4 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>Nothing matches “{q}”</EmptyTitle>
              <EmptyDescription>
                Try a shorter word, or clear the search to see every quiz.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => setQ("")}>
              Clear search
            </Button>
          </Empty>
        ) : (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodo className="size-4 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No quizzes yet</EmptyTitle>
              <EmptyDescription>
                Open a note and choose Quiz. The questions come from that note,
                and every answer links back to the page it came from.
              </EmptyDescription>
            </EmptyHeader>
            <Button asChild>
              <Link href="/upload">
                <Sparkles className="mr-2 size-4" />
                Make your first quiz
              </Link>
            </Button>
          </Empty>
        )}
      </PendingRegion>
    </div>
  );
}
