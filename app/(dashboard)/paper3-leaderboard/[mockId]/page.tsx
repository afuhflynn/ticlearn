"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { usePaper3Leaderboard, usePaper3Mock } from "@/hooks";

export default function Paper3LeaderboardPage() {
  const params = useParams();
  const mockId = params.mockId as string;

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: mockData } = usePaper3Mock(mockId);
  const { data, isLoading } = usePaper3Leaderboard(mockId, page, limit);

  const leaderboard = data?.leaderboard ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentUserRank = data?.currentUserRank;

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800";
    if (rank === 2) return "bg-gray-100 text-gray-800";
    if (rank === 3) return "bg-amber-100 text-amber-800";
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <Link
            href="/practice"
            className="text-sm text-primary hover:underline"
          >
            &larr; Back to Practice
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">
            {mockData?.mock?.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Leaderboard</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Student
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Score
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaderboard.map(
                    (entry: {
                      userId: string;
                      rank: number;
                      score: number;
                      userImage?: string;
                      userName?: string;
                      currentUserRank: number;
                      timeTaken?: number;
                    }) => (
                      <tr
                        key={entry.userId}
                        className={`${
                          currentUserRank === entry.rank ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              entry.rank <= 3
                                ? getRankStyle(entry.rank)
                                : "bg-gray-100"
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.userImage ? (
                              <Image
                                src={entry.userImage}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                                {entry.userName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium truncate max-w-[150px] md:max-w-none">
                              {entry.userName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold ${
                              entry.score >= 80
                                ? "text-green-600"
                                : entry.score >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {Math.round(entry.score)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          {entry.timeTaken
                            ? `${Math.floor(entry.timeTaken / 60)}m ${entry.timeTaken % 60}s`
                            : "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">
              No submissions yet. Be the first to take this exam!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
