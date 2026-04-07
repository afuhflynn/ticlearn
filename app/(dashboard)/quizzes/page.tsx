"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListTodo, Plus, Search, Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockQuizzes = [
  {
    id: "1",
    title: "Biology Cell Structure Quiz",
    noteTitle: "Chapter 1: Cell Structure",
    questionCount: 10,
    status: "READY" as const,
    isPublic: false,
    createdAt: new Date().toISOString(),
  },
];

export default function QuizzesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
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

  const quizzes = mockQuizzes;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quizzes..." className="pl-9" />
      </div>

      {/* Quiz Grid */}
      {quizzes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
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
                    <Button size="sm" asChild>
                      <Link href={`/quiz/${quiz.id}`}>
                        <Play className="mr-1 h-4 w-4" />
                        Start
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
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
