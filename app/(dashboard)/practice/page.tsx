"use client";

import Link from "next/link";
import { useState } from "react";
import { Paper3ContentRenderer } from "@/components/paper3";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCheckPaper3Answer,
  usePaper3Mocks,
  usePaper3PracticeQuestions,
} from "@/hooks";

type PracticeCategory =
  | "MIXED"
  | "DATABASE"
  | "SPREADSHEET"
  | "PROGRAMMING"
  | "WEB_PROGRAMMING";

interface EvaluationResult {
  isCorrect: boolean;
  marksEarned: number;
  totalMarks: number;
  feedback: string;
  correctAnswer: string;
  explanation?: string;
  breakdown?: Array<{
    criteria: string;
    marks: number;
    description: string;
  }>;
}

interface PracticeQuestion {
  id: string;
  questionNumber: string;
  title: string;
  taskType: string;
  content?: string | null;
  contentMd?: string | null;
  marks: number;
  explanation?: string | null;
  visualElements?: unknown;
  taskItems?: unknown;
  source?: {
    title: string;
    subject: string;
    category: string;
  };
}

interface PracticeMock {
  id: string;
  title: string;
  subject: string;
  timeLimit: number;
  totalMarks: number;
}

const categories: Array<{ value: PracticeCategory; label: string }> = [
  { value: "MIXED", label: "Mixed" },
  { value: "DATABASE", label: "Database" },
  { value: "SPREADSHEET", label: "Spreadsheet" },
  { value: "PROGRAMMING", label: "Programming" },
  { value: "WEB_PROGRAMMING", label: "Web Programming" },
];

function getCategoryHint(category: PracticeCategory) {
  switch (category) {
    case "DATABASE":
      return "ICT focuses on Microsoft Access tasks. Computer Science can include SQL.";
    case "SPREADSHEET":
      return "Excel grids, formulas, and calculation-heavy practical work.";
    case "PROGRAMMING":
      return "C, Pascal, and algorithmic problem-solving tasks.";
    case "WEB_PROGRAMMING":
      return "HTML + CSS only, with inline styling and no JavaScript.";
    default:
      return "Mix practice questions and mock exams across Paper 3 categories.";
  }
}

export default function PracticePage() {
  const [category, setCategory] = useState<PracticeCategory>("MIXED");
  const [selectedQuestion, setSelectedQuestion] =
    useState<PracticeQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const practiceQuery = usePaper3PracticeQuestions({
    category: category === "MIXED" ? undefined : category,
    limit: 20,
  });
  const mocksQuery = usePaper3Mocks({
    status: "PUBLISHED",
    focusCategory: category === "MIXED" ? undefined : category,
  });
  const checkAnswer = useCheckPaper3Answer();

  const questions = (practiceQuery.data?.questions ?? []) as PracticeQuestion[];
  const mocks = (mocksQuery.data?.mocks ?? []) as PracticeMock[];

  const handleSelectQuestion = (question: PracticeQuestion) => {
    setSelectedQuestion(question);
    setUserAnswer("");
    setResult(null);
  };

  const handleCheck = async () => {
    if (!selectedQuestion) return;

    const response = await checkAnswer.mutateAsync({
      questionId: selectedQuestion.id,
      userAnswer,
    });
    setResult(response.result);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paper 3 Practice</h1>
        <p className="text-muted-foreground">
          Choose a category, practise individual questions, or jump into a full
          mock.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Menu</CardTitle>
          <CardDescription>{getCategoryHint(category)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={category}
            onValueChange={(value) => setCategory(value as PracticeCategory)}
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              {categories.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="border"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-2 text-right">
              <Link href="/practice/history" className="text-sm text-primary hover:underline">
                View My Exam History →
              </Link>
            </div>
            {categories.map((item) => (
              <TabsContent
                key={item.value}
                value={item.value}
                className="mt-4"
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>
              Approved Paper 3 questions in the selected category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {practiceQuery.isLoading ? (
              [1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)
            ) : questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved questions yet for this category.
              </p>
            ) : (
              questions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => handleSelectQuestion(question)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedQuestion?.id === question.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {question.questionNumber}. {question.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {question.taskType} ·{" "}
                        {question.source?.subject ?? "Paper 3"}
                      </p>
                    </div>
                    <Badge variant="outline">{question.marks} marks</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mock Exams</CardTitle>
            <CardDescription>
              Published mocks filtered to the same focus category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mocksQuery.isLoading ? (
              [1, 2].map((item) => <Skeleton key={item} className="h-24" />)
            ) : mocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published mock exams in this category yet.
              </p>
            ) : (
              mocks.map((mock) => (
                <Link
                  key={mock.id}
                  href={`/practice/exam/${mock.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{mock.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mock.subject} · {mock.timeLimit} minutes
                      </p>
                    </div>
                    <Badge>{mock.totalMarks} marks</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selectedQuestion ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Practice Question: {selectedQuestion.questionNumber}
            </CardTitle>
            <CardDescription>
              Markdown-first rendering is used so tables, code, and practical
              layouts stay intact.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Paper3ContentRenderer
              content={selectedQuestion.content}
              contentMd={selectedQuestion.contentMd}
              visualElements={selectedQuestion.visualElements as never}
            />

            <div className="space-y-3">
              <Textarea
                value={userAnswer}
                onChange={(event) => setUserAnswer(event.target.value)}
                placeholder="Enter your answer here..."
                rows={8}
              />
              <Button
                onClick={handleCheck}
                disabled={
                  checkAnswer.isPending || userAnswer.trim().length === 0
                }
              >
                {checkAnswer.isPending ? "Checking..." : "Check Answer"}
              </Button>
            </div>

            {result ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {result.isCorrect ? "Correct" : "Needs Work"}
                  </p>
                  <Badge variant={result.isCorrect ? "default" : "secondary"}>
                    {result.marksEarned}/{result.totalMarks}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.feedback}
                </p>
                <div>
                  <p className="text-sm font-medium">Correct answer</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.correctAnswer}
                  </p>
                </div>
                {result.breakdown?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Marking breakdown</p>
                    {result.breakdown.map((item, index) => (
                      <div
                        key={`${item.criteria}-${index}`}
                        className="rounded border p-3"
                      >
                        <p className="text-sm font-medium">
                          {item.criteria} ({item.marks})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
