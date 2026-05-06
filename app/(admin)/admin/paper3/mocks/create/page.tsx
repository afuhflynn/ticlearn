"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCreatePaper3Mock,
  useGeneratePaper3Mock,
  usePaper3Questions,
} from "@/hooks";

export default function CreateMockExamPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
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
      questionsData?.questions?.filter((q: { status: string }) => q.status === "APPROVED") ?? []
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

  return (
    <div className="container mx-auto py-4 md:py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Create Mock Exam</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new mock exam either manually or with AI assistance
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-lg ${
            mode === "manual"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Manual Select
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`px-4 py-2 rounded-lg ${
            mode === "ai"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Generate with AI
        </button>
      </div>

      {mode === "manual" ? (
        <form onSubmit={handleManualSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Exam Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., ICT Paper 3 Final Mock"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subject: e.target.value as "ICT" | "COMPUTER_SCIENCE",
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="ICT">ICT</option>
                <option value="COMPUTER_SCIENCE">Computer Science</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="focusCategory" className="text-sm font-medium">
                Focus Category
              </label>
              <select
                id="focusCategory"
                value={formData.focusCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    focusCategory: e.target
                      .value as typeof formData.focusCategory,
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="MIXED">Mixed</option>
                <option value="DATABASE">Database</option>
                <option value="SPREADSHEET">Spreadsheet</option>
                <option value="PROGRAMMING">Programming</option>
                <option value="WEB_PROGRAMMING">Web Programming</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
              rows={2}
              placeholder="Brief description of the exam"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="timeLimit" className="text-sm font-medium">
              Time Limit (minutes)
            </label>
            <input
              id="timeLimit"
              type="number"
              value={formData.timeLimit}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeLimit: parseInt(e.target.value, 10),
                })
              }
              className="w-full p-2 border rounded-lg"
              min={15}
              max={180}
            />
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                Select Questions ({selectedQuestions.length} selected)
              </h2>
              <div className="text-sm text-gray-500">
                Total Marks: {totalMarks}
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">Loading questions...</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {approvedQuestions.map((q: { id: string; title: string; marks: number; questionNumber: string; section: string; taskType: string; source?: { title: string } }) => (
                  <label
                    key={q.id}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedQuestions.includes(q.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">
                          {q.questionNumber}: {q.title}
                        </span>
                        <span className="text-sm text-gray-500">
                          {q.marks} marks
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {q.section} | {q.taskType} | {q.source?.title}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {approvedQuestions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No approved questions available. Please review and approve
                questions first.
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedQuestions.length === 0 || createMock.isPending}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {createMock.isPending ? "Creating..." : "Create Mock Exam"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAISubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700">
              AI will generate unique questions based on your approved sources.
              At least 1 approved source is required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Exam Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., ICT Paper 3 AI Mock"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subject: e.target.value as "ICT" | "COMPUTER_SCIENCE",
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="ICT">ICT</option>
                <option value="COMPUTER_SCIENCE">Computer Science</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="focusCategory" className="text-sm font-medium">
                Focus Category
              </label>
              <select
                id="focusCategory"
                value={formData.focusCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    focusCategory: e.target
                      .value as typeof formData.focusCategory,
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="MIXED">Mixed</option>
                <option value="DATABASE">Database</option>
                <option value="SPREADSHEET">Spreadsheet</option>
                <option value="PROGRAMMING">Programming</option>
                <option value="WEB_PROGRAMMING">Web Programming</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="section" className="text-sm font-medium">
                Section
              </label>
              <select
                id="section"
                value={formData.section}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    section: e.target.value as "A" | "B",
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="timeLimit" className="text-sm font-medium">
                Time Limit (minutes)
              </label>
              <input
                id="timeLimit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timeLimit: parseInt(e.target.value, 10),
                  })
                }
                className="w-full p-2 border rounded-lg"
                min={15}
                max={180}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="questionCount" className="text-sm font-medium">
              Number of Questions: {questionCount}
            </label>
            <input
              id="questionCount"
              type="range"
              min={5}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
              rows={2}
              placeholder="Brief description of the exam"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generateMock.isPending}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {generateMock.isPending ? "Generating..." : "Generate with AI"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
