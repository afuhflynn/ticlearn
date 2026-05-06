"use client";

import { useState } from "react";
import {
  useApprovePaper3Question,
  usePaper3Questions,
  useRejectPaper3Question,
} from "@/hooks";

export default function Paper3QuestionsPage() {
  const [filter, setFilter] = useState({ status: "", section: "" });
  const { data, isLoading, refetch } = usePaper3Questions(filter);
  const approveQuestion = useApprovePaper3Question();
  const rejectQuestion = useRejectPaper3Question();

  const handleFilterChange = (key: string, value: string) => {
    setFilter({ ...filter, [key]: value });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Paper 3 Questions</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={filter.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={filter.section}
          onChange={(e) => handleFilterChange("section", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
        </select>
      </div>

      <div className="space-y-4">
        {data?.questions?.map((question: { id: string; questionNumber: string; title: string; status: string; marks: number; section: string; taskType: string; content: string }) => (
          <div key={question.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {question.questionNumber}: {question.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {question.section} | {question.taskType} | {question.marks}{" "}
                  marks
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${getStatusColor(question.status)}`}
              >
                {question.status}
              </span>
            </div>

            <div className="mt-3 text-sm">
              <p className="font-medium">Question:</p>
              <p className="mt-1 text-gray-700">{question.content}</p>
            </div>

            {question.status === "PENDING" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    approveQuestion.mutate(question.id);
                    refetch();
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rejectQuestion.mutate({ id: question.id });
                    refetch();
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {data?.questions?.length === 0 && (
        <div className="p-8 text-center text-gray-500">No questions found.</div>
      )}
    </div>
  );
}
