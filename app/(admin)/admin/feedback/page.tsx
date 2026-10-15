"use client";

import { Download, Loader2, MessageCircle, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminFeedback,
  useDeleteAdminFeedback,
  useGenerateAdminReport,
  useUpdateAdminFeedback,
} from "@/hooks/useAdmin";
import { useSession } from "@/lib/auth-client";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminFeedbackViewDefaults,
  adminFeedbackViewParsers,
} from "@/nuqs/admin-feedback";

function StarRating({ rating }: { rating: number | null }) {
  if (!rating || rating === 0) {
    return <span className="text-gray-400 text-sm">No rating</span>;
  }
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function getTypeBadgeVariant(type: string) {
  switch (type) {
    case "EXAM":
      return "default";
    case "BUG":
      return "destructive";
    case "FEATURE":
      return "secondary";
    case "CHAT":
      return "default";
    default:
      return "outline";
  }
}

export default function AdminFeedbackPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  // Filters and page live in the URL, so refresh, back, forward, and
  // shared links reproduce the same view.
  const [view, setView] = useQueryStates(
    {
      status: adminFeedbackViewParsers.status,
      type: adminFeedbackViewParsers.type,
      page: adminFeedbackViewParsers.page,
      limit: adminFeedbackViewParsers.limit,
    },
    { history: "push" },
  );
  const safePage = clampPage(view.page);
  const safeLimit = clampLimit(view.limit);
  const rawParams = useSearchParams();

  // Raw keys that disagree with canonical values correct themselves
  // with replace history.
  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      {
        status: view.status,
        type: view.type,
        page: safePage,
        limit: safeLimit,
      },
      adminFeedbackViewDefaults,
    );
    if (Object.keys(patch).length > 0) {
      setView(patch, { history: "replace" });
    }
  }, [rawParams, view.status, view.type, safePage, safeLimit, setView]);

  const { feedbacks, totalPages, isLoading, refetch } = useAdminFeedback({
    page: safePage,
    limit: safeLimit,
    status: view.status === "ALL" ? undefined : view.status,
  });
  const updateFeedback = useUpdateAdminFeedback();
  const deleteFeedback = useDeleteAdminFeedback();
  const generateReport = useGenerateAdminReport();

  if (sessionLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    router.push("/dashboard");
    return null;
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateFeedback.mutateAsync({ id, data: { status: newStatus } });
      toast.success("Feedback status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    try {
      await deleteFeedback.mutateAsync(id);
      toast.success("Feedback deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filteredFeedbacks =
    view.type === "ALL"
      ? feedbacks
      : feedbacks.filter((fb) => fb.type === view.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8" /> Feedback
          </h1>
          <p className="text-muted-foreground">
            Review and respond to user feedback
          </p>
        </div>
        <Button
          onClick={() => generateReport.mutate("feedback")}
          disabled={generateReport.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={view.status}
              onValueChange={(v) => {
                if (
                  v === "ALL" ||
                  v === "OPEN" ||
                  v === "IN_REVIEW" ||
                  v === "RESOLVED"
                ) {
                  setView({ status: v, page: 1 });
                }
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_REVIEW">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={view.type}
              onValueChange={(v) => {
                if (
                  v === "ALL" ||
                  v === "EXAM" ||
                  v === "CHAT" ||
                  v === "BUG" ||
                  v === "FEATURE" ||
                  v === "GENERAL"
                ) {
                  setView({ type: v, page: 1 });
                }
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="EXAM">Exam Feedback</SelectItem>
                <SelectItem value="CHAT">Chat Rating</SelectItem>
                <SelectItem value="BUG">Bug Report</SelectItem>
                <SelectItem value="FEATURE">Feature Request</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Exam / Chat</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No feedback found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeedbacks.map((fb) => (
                      <TableRow
                        key={fb.id}
                        className={fb.type === "EXAM" ? "bg-purple-50/50" : ""}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {fb.user?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {fb.user?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(fb.type)}>
                            {fb.type || "OTHER"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StarRating rating={fb.rating} />
                        </TableCell>
                        <TableCell>
                          {fb.type === "CHAT" &&
                          "conversationId" in fb &&
                          fb.conversationId ? (
                            <Link
                              href={`/chat/${fb.conversationId}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Chat
                            </Link>
                          ) : fb.mockId ? (
                            <Link
                              href={`/practice/exam/${fb.mockId}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Exam
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2 max-w-[200px]">
                            {fb.message || "No message"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={fb.status}
                            onValueChange={(v) => handleStatusChange(fb.id, v)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_REVIEW">
                                In Progress
                              </SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(fb.id)}
                            disabled={deleteFeedback.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={safePage === 1}
                  onClick={() => setView({ page: safePage - 1 })}
                >
                  Previous
                </Button>
                <span className="py-2">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={safePage === totalPages}
                  onClick={() => setView({ page: safePage + 1 })}
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
