"use client";

import Link from "next/link";
import { usePaper3Mocks } from "@/hooks";

export default function Paper3MocksPage() {
  const { data, isLoading } = usePaper3Mocks();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Paper 3 Mock Exams</h1>
        <Link
          href="/admin/paper3/mocks/create"
          className="py-2 px-4 bg-primary text-white rounded"
        >
          Create Mock Exam
        </Link>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : data?.mocks?.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No mock exams available.
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.mocks?.map((mock: { id: string; title: string; subject: string; timeLimit: number; questionCount: number; status: string; totalMarks: number }) => (
            <Link
              key={mock.id}
              href={`/practice/exam/${mock.id}`}
              className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{mock.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {mock.subject} | {mock.timeLimit} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{mock.totalMarks}</p>
                  <p className="text-xs text-gray-500">marks</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
