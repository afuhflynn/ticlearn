"use client";

import { FileText, Loader2, Medal, Trophy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  leaderboardViewDefaults,
  leaderboardViewParsers,
} from "@/nuqs/leaderboard";

export default function LeaderboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  // Page and size live in the URL, so refresh, back, forward, and
  // shared links reproduce the same view. View changes push history.
  const [view, setView] = useQueryStates(
    {
      page: leaderboardViewParsers.page,
      limit: leaderboardViewParsers.limit,
    },
    { history: "push" },
  );
  const safePage = clampPage(view.page);
  const safeLimit = clampLimit(view.limit);
  const rawParams = useSearchParams();

  // Raw keys that disagree with canonical values correct themselves
  // with replace history. This covers range faults (page 0) and
  // unparsable input (page abc, which already reads as the default).
  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      { page: safePage, limit: safeLimit },
      leaderboardViewDefaults,
    );
    const next: { page?: number; limit?: number } = {};
    if (typeof patch.page === "number") next.page = patch.page;
    if (typeof patch.limit === "number") next.limit = patch.limit;
    if (Object.keys(next).length > 0) {
      setView(next, { history: "replace" });
    }
  }, [rawParams, safePage, safeLimit, setView]);

  const quizData = useLeaderboard(safePage, safeLimit);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground">{rank}</span>;
  };

  const renderLeaderboardEntry = (entry: any) => (
    <div
      key={entry.userId}
      className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
        entry.userId === session?.user?.id
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/30"
      }`}
    >
      <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
      <Avatar>
        <AvatarFallback>{entry.userName?.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.userName}</p>
        <p className="text-sm text-muted-foreground">
          {entry.quizzesTaken || 0} quizzes • {entry.currentStreak || 0} day
          streak
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-lg">{entry.totalPoints}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-medium text-lg">No rankings yet</p>
        <p className="text-sm text-muted-foreground">
          Complete quizzes to appear on the leaderboard
        </p>
      </div>
      <Button onClick={() => router.push("/dashboard")}>Start Learning</Button>
    </div>
  );

  const renderPagination = (totalPages: number) =>
    totalPages > 1 && (
      <div className="flex justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage === 1}
          onClick={() => setView({ page: safePage - 1 })}
        >
          Previous
        </Button>
        <span className="py-2 px-3 text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage === totalPages}
          onClick={() => setView({ page: safePage + 1 })}
        >
          Next
        </Button>
      </div>
    );

  if (sessionPending) {
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

  const quizLeaderboard = quizData.leaderboard || [];
  const quizCurrentRank = quizData.currentUserRank;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank against other students
        </p>
      </div>

      {quizData.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Top Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quizCurrentRank ? (
              <Card className="mb-4 border-primary bg-primary/5">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Your Ranking</p>
                      <p className="text-sm text-muted-foreground">
                        Keep learning to climb!
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      <span className="text-xl font-bold">
                        #{quizCurrentRank}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {quizLeaderboard.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                <div className="space-y-3">
                  {quizLeaderboard.map((entry: any) =>
                    renderLeaderboardEntry(entry),
                  )}
                </div>
                {renderPagination(quizData.totalPages || 1)}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {quizData.isLoading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading rankings
        </div>
      ) : null}
    </div>
  );
}
