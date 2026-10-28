"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MathMarkdown } from "@/components/math-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuizAttempt } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { AttemptSkeleton } from "../../student-skeletons";

type AttemptAnswer = {
  id: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
};

type Attempt = {
  id: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string | null;
  quizTitle: string;
  answers: AttemptAnswer[];
};

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params.id;
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();

  const { data, isLoading, error } = useQuizAttempt(attemptId);
  const attempt = data?.attempt as Attempt | undefined;

  if (sessionPending || isLoading) {
    return <AttemptSkeleton />;
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  if (error || !attempt) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Could not load attempt details.
            </p>
            <div className="flex justify-center mt-4">
              <Button asChild>
                <Link href="/quizzes">Go to quizzes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quizzes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{attempt.quizTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Completed{" "}
            {attempt.completedAt
              ? new Date(attempt.completedAt).toLocaleDateString()
              : "recently"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attempt Summary</CardTitle>
          <CardDescription>
            Review your performance and question-by-question feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{attempt.score}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Correct</p>
              <p className="text-2xl font-bold">
                {attempt.correctAnswers}/{attempt.totalQuestions}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="text-2xl font-bold">{attempt.totalQuestions}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <Link href="/quizzes">Retake Quiz</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Question Review</h2>
        {attempt.answers.map((answer, index) => (
          <Card key={answer.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    Question {index + 1}
                  </CardTitle>
                </div>
                <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                  {answer.isCorrect ? "Correct" : "Incorrect"}
                </Badge>
              </div>
              <CardDescription>
                <MathMarkdown
                  content={answer.question}
                  className="text-sm text-muted-foreground leading-7"
                />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Your answer</p>
                <div
                  className={`p-3 rounded-lg border ${
                    answer.isCorrect
                      ? "bg-green-50 border-green-200 dark:bg-green-950"
                      : "bg-red-50 border-red-200 dark:bg-red-950"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      answer.isCorrect
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {answer.userAnswer || "No answer submitted"}
                  </p>
                </div>
              </div>
              {!answer.isCorrect && (
                <div>
                  <p className="text-sm font-medium mb-1">Correct answer</p>
                  <div className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950">
                    <div className="text-green-700 dark:text-green-300">
                      <MathMarkdown content={answer.correctAnswer} />
                    </div>
                  </div>
                </div>
              )}
              {answer.isCorrect && (
                <div>
                  <p className="text-sm font-medium mb-1">Correct answer</p>
                  <div className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950">
                    <div className="text-green-700 dark:text-green-300">
                      <MathMarkdown content={answer.correctAnswer} />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Explanation</p>
                <div className="p-3 rounded-lg bg-muted text-muted-foreground space-y-1">
                  <MathMarkdown
                    content={answer.explanation || "No explanation available."}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
