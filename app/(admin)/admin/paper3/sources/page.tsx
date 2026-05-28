"use client";

import Link from "next/link";
import {
  useDeletePaper3Source,
  usePaper3Sources,
  useProcessPaper3Source,
} from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function Paper3SourcesPage() {
  const { data, isLoading } = usePaper3Sources();
  const deleteSource = useDeletePaper3Source();
  const processSource = useProcessPaper3Source();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY":
        return "bg-green-100 text-green-800";
      case "PROCESSING":
        return "bg-yellow-100 text-yellow-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Link
        href="/admin/paper3/upload"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Upload
      </Link>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Paper 3 Sources</h1>
        <Link
          href="/admin/paper3/upload"
          className="py-2 px-4 bg-primary text-white rounded"
        >
          Upload New Source
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Year</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Section
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Added</th>
              <th className="px-4 py-3 text-right text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.sources?.map((source: { id: string; title: string; year: number; questionCount: number; status: string; subject: string; section: string; createdAt: string }) => (
              <tr key={source.id}>
                <td className="px-4 py-3">{source.title}</td>
                <td className="px-4 py-3">{source.year}</td>
                <td className="px-4 py-3">{source.subject}</td>
                <td className="px-4 py-3">{source.section}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(source.status)}`}
                  >
                    {source.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatRelativeTime(source.createdAt)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {source.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => processSource.mutate(source.id)}
                      className="text-blue-600 hover:underline"
                    >
                      Process
                    </button>
                  )}
                  <Link
                    href={`/admin/paper3/questions?source=${source.id}`}
                    className="text-green-600 hover:underline"
                  >
                    Questions
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteSource.mutate(source.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.sources?.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No sources uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
