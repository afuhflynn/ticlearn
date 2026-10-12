"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCreatePaper3Mock,
  useGeneratePaper3Mock,
  usePaper3Questions,
} from "@/hooks";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";

type Step = "info" | "method" | "review";

export default function CreateMockExamPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [mode, setMode] = useState<"manual" | "ai" | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "ICT" as "ICT" | "COMPUTER_SCIENCE",
    section: "A" as "A" | "B",
    focusCategory: "MIXED" as
      | "MIXED"
      | "DATABASE"
      | "SPREADSHEET"
      | "PROGRAMMING"
      | "WEB_PROGRAMMING",
    timeLimit: 60,
  });
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const { data: questionsData, isLoading } = usePaper3Questions({
    status: "APPROVED",
    section: "",
    taskType: "",
    category: formData.focusCategory === "MIXED" ? "" : formData.focusCategory,
  });
  const createMock = useCreatePaper3Mock();
  const generateMock = useGeneratePaper3Mock();

  const approvedQuestions = useMemo(() => {
    return (
      questionsData?.questions?.filter(
        (q: { status: string }) => q.status === "APPROVED",
      ) ?? []
    );
  }, [questionsData]);

  const totalMarks = useMemo(() => {
    return selectedQuestions.reduce((sum, id) => {
      const q = approvedQuestions.find((q: { id: string }) => q.id === id);
      return sum + (q?.marks ?? 0);
    }, 0);
  }, [selectedQuestions, approvedQuestions]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  const selectAll = () => {
    setSelectedQuestions(approvedQuestions.map((q: { id: string }) => q.id));
  };

  const deselectAll = () => {
    setSelectedQuestions([]);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) return;

    await createMock.mutateAsync({
      ...formData,
      questionIds: selectedQuestions,
    });

    router.push("/admin/paper3/mocks");
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await generateMock.mutateAsync({
      ...formData,
      questionCount,
    });

    router.push("/admin/paper3/mocks");
  };

  const steps = [
    { key: "info", label: "Details" },
    { key: "method", label: "Method" },
    { key: "review", label: "Review" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push("/admin/paper3/mocks")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to mocks
        </Button>
        <h1 className="text-2xl font-bold">Create Mock Exam</h1>
        <p className="text-muted-foreground mt-1">
          Create a mock exam by selecting approved questions manually or
          generating new ones with AI.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <Badge
              variant={
                step === s.key
                  ? "default"
                  : steps.findIndex((x) => x.key === step) > i
                    ? "default"
                    : "outline"
              }
              className={
                steps.findIndex((x) => x.key === step) > i ? "bg-green-600" : ""
              }
            >
              {steps.findIndex((x) => x.key === step) > i ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <span className="mr-1">{i + 1}</span>
              )}
              {s.label}
            </Badge>
            {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>
              Set the basic information for your mock exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Exam Title</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., ICT Paper 3 Final Mock"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      subject: v as "ICT" | "COMPUTER_SCIENCE",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICT">ICT</SelectItem>
                    <SelectItem value="COMPUTER_SCIENCE">
                      Computer Science
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focusCategory">Focus Category</Label>
                <Select
                  value={formData.focusCategory}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      focusCategory: v as typeof formData.focusCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                    <SelectItem value="DATABASE">Database</SelectItem>
                    <SelectItem value="SPREADSHEET">Spreadsheet</SelectItem>
                    <SelectItem value="PROGRAMMING">Programming</SelectItem>
                    <SelectItem value="WEB_PROGRAMMING">
                      Web Programming
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeLimit: parseInt(e.target.value, 10),
                    })
                  }
                  min={15}
                  max={180}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the exam"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep("method")}
                disabled={!formData.title.trim()}
              >
                Next: Choose Method
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Method */}
      {step === "method" && (
        <div className="space-y-6">
          {/* Manual method */}
          <Card
            className={`cursor-pointer transition-all ${
              mode === "manual"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setMode("manual")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check
                  className={`h-5 w-5 ${
                    mode === "manual" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                Manual: Pick from approved questions
              </CardTitle>
              <CardDescription>
                Choose individual questions from the approved question bank. You
                control exactly which questions appear.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {approvedQuestions.length} approved questions available
                </Badge>
                {formData.focusCategory !== "MIXED" && (
                  <Badge variant="outline">
                    Filtered: {formData.focusCategory}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI method */}
          <Card
            className={`cursor-pointer transition-all ${
              mode === "ai" ? "ring-2 ring-primary" : "hover:border-primary/50"
            }`}
            onClick={() => setMode("ai")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles
                  className={`h-5 w-5 ${
                    mode === "ai" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                AI: Generate with AI
              </CardTitle>
              <CardDescription>
                AI generates unique questions based on your approved sources and
                syllabus. At least 1 approved source is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="questionCount">
                  Number of questions: {questionCount}
                </Label>
                <input
                  id="questionCount"
                  type="range"
                  min={5}
                  max={50}
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(parseInt(e.target.value, 10))
                  }
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep("info")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep("review")} disabled={!mode}>
              Next: Review
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <>
          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Select Questions ({selectedQuestions.length} selected)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Total: {totalMarks} marks
                      </span>
                      {approvedQuestions.length > 0 && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={selectAll}
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={deselectAll}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : approvedQuestions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <p>No approved questions available.</p>
                      <p className="text-sm mt-1">
                        Approve questions first in the{" "}
                        <a
                          href="/admin/paper3/questions"
                          className="text-primary hover:underline"
                        >
                          Questions
                        </a>{" "}
                        page.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {approvedQuestions.map(
                        (q: {
                          id: string;
                          title: string;
                          marks: number;
                          questionNumber: string;
                          section: string;
                          taskType: string;
                          source?: { title: string };
                        }) => (
                          <label
                            key={q.id}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedQuestions.includes(q.id)
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedQuestions.includes(q.id)}
                              onChange={() => toggleQuestion(q.id)}
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between">
                                <span className="font-medium text-sm truncate">
                                  {q.questionNumber}: {q.title}
                                </span>
                                <span className="text-sm text-muted-foreground shrink-0 ml-2">
                                  {q.marks} marks
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Section {q.section} &middot; {q.taskType}
                                {q.source?.title &&
                                  ` &middot; ${q.source.title}`}
                              </p>
                            </div>
                          </label>
                        ),
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep("method")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    selectedQuestions.length === 0 || createMock.isPending
                  }
                >
                  {createMock.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create Mock (${selectedQuestions.length} questions)`
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAISubmit} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Mock</CardTitle>
                  <CardDescription>
                    AI will generate {questionCount} unique questions based on
                    your approved sources.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <p className="text-sm font-medium">
                        {formData.subject === "ICT"
                          ? "ICT"
                          : "Computer Science"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Focus</Label>
                      <p className="text-sm font-medium">
                        {formData.focusCategory === "MIXED"
                          ? "Mixed"
                          : formData.focusCategory}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <p className="text-sm font-medium">
                        Section {formData.section}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Questions</Label>
                      <p className="text-sm font-medium">{questionCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep("method")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={generateMock.isPending}>
                  {generateMock.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
