"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, Medal, Loader2, Globe, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard, usePaper3Leaderboard, useGlobalPaper3Leaderboard } from "@/hooks";

type LeaderboardTab = "quiz" | "paper3-exam" | "paper3-global";

export default function LeaderboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("quiz");
  
  const mockId = searchParams.get("mockId");
  const questionId = searchParams.get("questionId");
  
  const { data: paper3ExamData, isLoading: paper3ExamLoading } = usePaper3Leaderboard(mockId || "", page, 20);
  const { data: paper3GlobalData, isLoading: paper3GlobalLoading, refetch: refetchGlobal } = useGlobalPaper3Leaderboard(page, 20);
  const quizData = useLeaderboard(page, 20);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground">{rank}</span>;
  };

  const renderLeaderboardEntry = (entry: any, isGlobal: boolean = false) => (
    <div
      key={entry.userId}
      className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
        entry.userId === session?.user?.id
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/30"
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
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.userName}</p>
        {isGlobal ? (
          <p className="text-sm text-muted-foreground">
            {entry.examsTaken || 0} exams • Avg: {entry.avgScore || 0}%
          </p>
        ) : activeTab === "quiz" ? (
          <p className="text-sm text-muted-foreground">
            {entry.quizzesTaken || 0} quizzes • {entry.currentStreak || 0} day streak
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {entry.timeTaken ? `${Math.floor(entry.timeTaken / 60)}m` : '--'} • Score: {entry.score}%
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-lg">
          {isGlobal ? entry.totalPoints : activeTab === "quiz" ? entry.totalPoints : `${entry.score}%`}
        </p>
        <p className="text-xs text-muted-foreground">
          {isGlobal ? "points" : activeTab === "quiz" ? "points" : "score"}
        </p>
      </div>
    </div>
  );

  const renderEmptyState = (isGlobal: boolean = false) => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-medium text-lg">No rankings yet</p>
        <p className="text-sm text-muted-foreground">
          {isGlobal 
            ? "Complete Paper 3 exams to appear on the global leaderboard"
            : activeTab === "quiz"
            ? "Complete quizzes to appear on the leaderboard"
            : "Be the first to complete this exam!"
          }
        </p>
      </div>
      {!isGlobal && activeTab === "quiz" && (
        <Button onClick={() => router.push("/dashboard")}>
          Start Learning
        </Button>
      )}
    </div>
  );

  const renderPagination = (totalPages: number) => (
    totalPages > 1 && (
      <div className="flex justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="py-2 px-3 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    )
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
  const paper3ExamLeaderboard = paper3ExamData?.leaderboard || [];
  const paper3GlobalLeaderboard = paper3GlobalData?.leaderboard || [];

  const quizCurrentRank = quizData.currentUserRank;
  const paper3ExamCurrentRank = paper3ExamData?.currentUserRank;
  const paper3GlobalCurrentRank = paper3GlobalData?.currentUserRank;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank against other students
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quiz" className="gap-2">
            <FileText className="h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="paper3-exam" className="gap-2">
            <FileText className="h-4 w-4" />
            Paper 3 (Exam)
          </TabsTrigger>
          <TabsTrigger value="paper3-global" className="gap-2">
            <Globe className="h-4 w-4" />
            Paper 3 (Global)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz" className="mt-6">
          {quizData.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Top Learners</CardTitle>
              </CardHeader>
              <CardContent>
                {quizCurrentRank && (
                  <Card className="mb-4 border-primary bg-primary/5">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Your Ranking</p>
                          <p className="text-sm text-muted-foreground">Keep learning to climb!</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <span className="text-xl font-bold">#{quizCurrentRank}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {quizLeaderboard.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <>
                    <div className="space-y-3">
                      {quizLeaderboard.map((entry: any) => renderLeaderboardEntry(entry, false))}
                    </div>
                    {renderPagination(quizData.totalPages || 1)}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paper3-exam" className="mt-6">
          {mockId ? (
            paper3ExamLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Exam Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  {paper3ExamCurrentRank && (
                    <Card className="mb-4 border-primary bg-primary/5">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Your Ranking</p>
                            <p className="text-sm text-muted-foreground">Keep practicing to climb!</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-primary" />
                            <span className="text-xl font-bold">#{paper3ExamCurrentRank}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {paper3ExamLeaderboard.length === 0 ? (
                    renderEmptyState(false)
                  ) : (
                    <>
                      <div className="space-y-3">
                        {paper3ExamLeaderboard.map((entry: any) => renderLeaderboardEntry(entry, false))}
                      </div>
                      {renderPagination(paper3ExamData?.totalPages || 1)}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Select an exam to view rankings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Take a Paper 3 exam and come back to see your ranking
                </p>
                <Button className="mt-4" onClick={() => router.push("/practice")}>
                  Go to Practice
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paper3-global" className="mt-6">
          {paper3GlobalLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Global Paper 3 Rankings
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchGlobal()}>
                    Refresh
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Rankings based on total points with recency weighting
                </p>
              </CardHeader>
              <CardContent>
                {paper3GlobalCurrentRank && (
                  <Card className="mb-4 border-primary bg-primary/5">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Your Global Ranking</p>
                          <p className="text-sm text-muted-foreground">
                            Based on your Paper 3 exam performance
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <span className="text-xl font-bold">#{paper3GlobalCurrentRank}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {paper3GlobalLeaderboard.length === 0 ? (
                  renderEmptyState(true)
                ) : (
                  <>
                    <div className="space-y-3">
                      {paper3GlobalLeaderboard.map((entry: any) => renderLeaderboardEntry(entry, true))}
                    </div>
                    {renderPagination(paper3GlobalData?.totalPages || 1)}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}