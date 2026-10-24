"use client";

import {
  ArrowRight,
  BotMessageSquare,
  ClipboardCheck,
  FileText,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PendingRegion } from "@/components/ui/pending-region";
import { useDashboardContinue } from "@/hooks";
import { formatDay } from "@/lib/utils";
import { DashboardContinueSkeleton } from "./dashboard-skeletons";

const DASHBOARD_LONG_WAIT =
  "Still loading your dashboard. This normally takes a moment.";

/**
 * The dashboard from spec 0014: where you left off, and one way to add more.
 *
 * Three pieces of evidence and one action. No stat cards, no chart, no score.
 * The last quiz card opens the attempt review page, which is the one address
 * that reopens a past attempt.
 */
export function DashboardClient({ userName }: { userName: string }) {
  const {
    recentNotes,
    lastAttempt,
    lastConversation,
    isPending,
    isRefreshing,
    isError,
    isOffline,
    refetch,
  } = useDashboardContinue();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Welcome back, {userName.split(" ")[0] || "Student"}!
        </h1>
        <Button asChild>
          <Link href="/upload">
            <Plus className="mr-2 h-4 w-4" /> Upload
          </Link>
        </Button>
      </div>

      <PendingRegion
        fallback={<DashboardContinueSkeleton />}
        isPending={isPending}
        isRefreshing={isRefreshing}
        isError={isError}
        isOffline={isOffline}
        label="Where you left off"
        longWaitMessage={DASHBOARD_LONG_WAIT}
        onRetry={() => void refetch()}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent notes</CardTitle>
              <CardDescription>Your last study materials</CardDescription>
            </CardHeader>
            <CardContent>
              {recentNotes.length > 0 ? (
                <div className="space-y-3">
                  {recentNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/notes/${note.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{note.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {note.fileName}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          note.status === "READY" ? "default" : "secondary"
                        }
                      >
                        {note.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No notes yet</EmptyTitle>
                    <EmptyDescription>
                      Upload a handout, a slide photo or a typed course.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/upload">Upload a note</Link>
                  </Button>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Last quiz</CardTitle>
              <CardDescription>The last one you answered</CardDescription>
            </CardHeader>
            <CardContent>
              {lastAttempt ? (
                <Link
                  href={`/attempts/${lastAttempt.attemptId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {lastAttempt.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Answered {formatDay(lastAttempt.answeredAt)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardCheck className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No quiz answered yet</EmptyTitle>
                    <EmptyDescription>
                      Make a quiz from one of your notes to start practising.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/quizzes">Go to my quizzes</Link>
                  </Button>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Last conversation</CardTitle>
              <CardDescription>
                Pick up with Tip where you stopped
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastConversation ? (
                <Link
                  href={`/chat/${lastConversation.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <BotMessageSquare className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {lastConversation.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Opened {formatDay(lastConversation.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ) : (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BotMessageSquare className="size-4 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No conversation yet</EmptyTitle>
                    <EmptyDescription>
                      Tip reads your note and teaches it back to you.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/chat">Ask Tip</Link>
                  </Button>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>
      </PendingRegion>
    </div>
  );
}
