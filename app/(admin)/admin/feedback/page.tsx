"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  useAdminFeedback,
  useUpdateAdminFeedback,
  useDeleteAdminFeedback,
  useGenerateAdminReport,
} from "@/hooks/useAdmin";
import { MessageCircle, Loader2, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminFeedbackPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { feedbacks, isLoading, refetch } = useAdminFeedback({
    page,
    limit: 20,
    status: status || undefined,
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
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    try {
      await deleteFeedback.mutateAsync(id);
      toast.success("Feedback deleted");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

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
          <div className="flex items-center gap-4">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No feedback found
                    </TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((fb) => (
                    <TableRow key={fb.id}>
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
                        <Badge variant="outline">{fb.type || "OTHER"}</Badge>
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
                            <SelectItem value="IN_PROGRESS">
                              In Progress
                            </SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
