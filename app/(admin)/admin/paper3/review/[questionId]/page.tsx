"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useApprovePaper3Question,
  usePaper3Question,
  useRejectPaper3Question,
  useUpdatePaper3Question,
} from "@/hooks";

export default function Paper3ReviewPage() {
  const params = useParams();
  const questionId = params.questionId as string;

  const [editedContent, setEditedContent] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [editedMarks, setEditedMarks] = useState(0);
  const [editedBreakdown, setEditedBreakdown] = useState("");
  const [editedExplanation, setEditedExplanation] = useState("");

  const { data: question, isLoading, refetch } = usePaper3Question(questionId);
  const updateQuestion = useUpdatePaper3Question();
  const approveQuestion = useApprovePaper3Question();
  const rejectQuestion = useRejectPaper3Question();

  const handleSave = async () => {
    if (!questionId) return;

    try {
      await updateQuestion.mutateAsync({
        id: questionId,
        content: editedContent,
        expectedAnswer: editedAnswer,
        marks: editedMarks,
        markingBreakdown: editedBreakdown,
        explanation: editedExplanation,
      });
      await refetch();
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  };

  const handleApprove = async () => {
    if (!questionId) return;

    try {
      await approveQuestion.mutateAsync(questionId);
    } catch (error) {
      console.error("Failed to approve question:", error);
    }
  };

  const handleReject = async () => {
    if (!questionId) return;

    try {
      await rejectQuestion.mutateAsync({
        id: questionId,
        rejectionReason: "Rejected by admin",
      });
    } catch (error) {
      console.error("Failed to reject question:", error);
    }
  };

  if (!questionId) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Review Paper 3 Questions</h1>
        <p className="text-gray-500">
          This page requires a question ID. Use the questions list to select a
          question to review.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-gray-500">Question not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Review Question</h1>
        <div className="flex gap-2">
          {question.status === "PENDING" && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveQuestion.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {approveQuestion.isPending ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectQuestion.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {rejectQuestion.isPending ? "Rejecting..." : "Reject"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <label
            htmlFor="questionNumber"
            className="block text-sm font-medium mb-1"
          >
            Question Number
          </label>
          <input
            id="questionNumber"
            type="text"
            value={question.questionNumber}
            readOnly
            className="w-full p-2 border rounded bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={question.title}
            readOnly
            className="w-full p-2 border rounded bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Content
          </label>
          <textarea
            value={editedContent || question.content}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 border rounded min-h-[100px]"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="marks" className="block text-sm font-medium mb-1">
              Marks
            </label>
            <input
              id="marks"
              type="number"
              value={editedMarks || question.marks}
              onChange={(e) => setEditedMarks(parseInt(e.target.value, 10))}
              className="w-full p-2 border rounded"
              min={1}
              max={20}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status
            </label>
            <input
              id="status"
              type="text"
              value={question.status}
              readOnly
              className="w-full p-2 border rounded bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="expectedAnswer"
            className="block text-sm font-medium mb-1"
          >
            Expected Answer
          </label>
          <textarea
            id="expectedAnswer"
            value={editedAnswer || question.expectedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
            className="w-full p-2 border rounded min-h-[80px]"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="markingBreakdown"
            className="block text-sm font-medium mb-1"
          >
            Marking Breakdown (JSON)
          </label>
          <textarea
            id="markingBreakdown"
            value={
              editedBreakdown ||
              JSON.stringify(question.markingBreakdown, null, 2)
            }
            onChange={(e) => setEditedBreakdown(e.target.value)}
            className="w-full p-2 border rounded font-mono text-sm"
            rows={4}
          />
        </div>

        <div>
          <label
            htmlFor="explanation"
            className="block text-sm font-medium mb-1"
          >
            Explanation
          </label>
          <textarea
            id="explanation"
            value={editedExplanation || question.explanation || ""}
            onChange={(e) => setEditedExplanation(e.target.value)}
            className="w-full p-2 border rounded min-h-[60px]"
            rows={2}
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateQuestion.isPending}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {updateQuestion.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
