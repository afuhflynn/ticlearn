"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  useAdminSubscriptions,
  useUpdateAdminSubscription,
  useDeleteAdminSubscription,
} from "@/hooks/useAdmin";
import { CreditCard, Loader2, Trash2, Download } from "lucide-react";
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

export default function AdminSubscriptionsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { subscriptions, totalPages, isLoading, refetch } =
    useAdminSubscriptions({
      page,
      limit: 20,
      status: status || undefined,
    });

  const updateMutation = useUpdateAdminSubscription();
  const deleteMutation = useDeleteAdminSubscription();

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status: newStatus } });
      toast.success("Subscription status updated");
      refetch();
    } catch (_error) {
      toast.error("Failed to update subscription");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Subscription deleted");
      refetch();
    } catch (_error) {
      toast.error("Failed to delete subscription");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscriptions", format: "pdf" }),
      });
      if (!response.ok) throw new Error("Failed to generate report");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscriptions-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (_error) {
      toast.error("Failed to generate report");
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!session?.user || (session.user as any)?.role !== "ADMIN") {
    router.push("/");
    return null;
  }

  const getStatusBadge = (s: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-500",
      EXPIRED: "bg-red-500",
      CANCELLED: "bg-gray-500",
      PENDING: "bg-yellow-500",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs text-white ${colors[s] || "bg-gray-500"}`}
      >
        {s}
      </span>
    );
  };

  const getPlanBadge = (p: string) => {
    const colors: Record<string, string> = {
      FREE: "bg-blue-500",
      BASIC: "bg-purple-500",
      PREMIUM: "bg-yellow-500",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs text-white ${colors[p] || "bg-gray-500"}`}
      >
        {p}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-purple-600" />
          Subscriptions Management
        </h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.userEmail}</TableCell>
                      <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {sub.activatedAt
                          ? new Date(sub.activatedAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {sub.amount ? `$${sub.amount}` : "Free"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={sub.status}
                            onValueChange={(v) => handleStatusChange(sub.id, v)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
