"use client";

import { ListTodo, Loader2, Play, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteQuiz, useQuizzes } from "@/hooks";
import { useSession } from "@/lib/auth-client";

type QuizListItem = {
  id: string;
  title: string;
  noteTitle?: string;
  questionCount: number;
  status: "GENERATING" | "READY" | "ERROR";
};

export default function QuizzesPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { quizzes, isLoading } = useQuizzes("my");
  const deleteQuiz = useDeleteQuiz();

  const hasGeneratingQuiz = (quizzes as QuizListItem[])?.some(
    (q) => q.status === "GENERATING"
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const filteredQuizzes = (quizzes as QuizListItem[]).filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.noteTitle?.toLowerCase().includes(searchQuery.toLowerCase()),
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
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating
              </span>
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

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quizzes..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {quiz.noteTitle}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={quiz.status === "READY" ? "default" : "secondary"}
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
                        <Link href={`/quiz/${quiz.id}`}>
                          <Play className="mr-1 h-4 w-4" />
                          Start
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <ListTodo className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No quizzes yet</p>
              <p className="text-sm text-muted-foreground">
                Generate your first quiz from uploaded notes
              </p>
            </div>
            <Button asChild>
              <Link href="/upload">
                <Plus className="mr-2 h-4 w-4" />
                Generate Quiz
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
