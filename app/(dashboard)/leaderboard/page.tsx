"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Trophy, Medal, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks";

export default function LeaderboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { leaderboard, currentUserRank, totalPages, isLoading } = useLeaderboard(page, 20);

  if (sessionPending || isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank against other students
        </p>
      </div>

      {currentUserRank && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Your Ranking</p>
                <p className="text-sm text-muted-foreground">
                  Keep learning to climb the leaderboard!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <span className="text-2xl font-bold">#{currentUserRank}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Learners</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No rankings yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete quizzes to appear on the leaderboard
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {leaderboard.map((entry: any) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${
                      entry.userId === session.user?.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <Avatar>
                      <AvatarFallback>
                        {entry.userName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{entry.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.quizzesTaken} quizzes • {entry.currentStreak} day
                        streak
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{entry.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="py-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
