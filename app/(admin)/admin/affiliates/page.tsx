"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  useAdminAffiliates,
  useUpdateAdminAffiliate,
  useDeleteAdminAffiliate,
} from "@/hooks/useAdmin";
import { Users, Loader2, Trash2, Download } from "lucide-react";
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

export default function AdminAffiliatesPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { affiliates, total, totalPages, isLoading, refetch } =
    useAdminAffiliates({
      page,
      limit: 20,
      status: status || undefined,
    });

  const updateMutation = useUpdateAdminAffiliate();
  const deleteMutation = useDeleteAdminAffiliate();

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status: newStatus } });
      toast.success("Affiliate status updated");
      refetch();
    } catch (_error) {
      toast.error("Failed to update affiliate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this affiliate?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Affiliate deleted");
      refetch();
    } catch (_error) {
      toast.error("Failed to delete affiliate");
    }
  };

  const handleExport = async (type: "pdf") => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "affiliates", format: type }),
      });
      if (!response.ok) throw new Error("Failed to generate report");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `affiliates-report.${type}`;
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

  if (!session?.user || (session.user as { role?: string })?.role !== "ADMIN") {
    router.push("/");
    return null;
  }

  const getStatusBadge = (s: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-500",
      INACTIVE: "bg-gray-500",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CM", {
      style: "currency",
      currency: "XAF",
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-purple-600" />
          Affiliates Management
        </h1>
        <Button onClick={() => handleExport("pdf")} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-gray-500">Total Affiliates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {affiliates?.filter((a) => a.status === "ACTIVE").length || 0}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {affiliates?.reduce((sum, a) => sum + a.totalClicks, 0) || 0}
            </div>
            <div className="text-sm text-gray-500">Total Clicks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(
                affiliates?.reduce((sum, a) => sum + a.totalEarnings, 0) || 0,
              )}
            </div>
            <div className="text-sm text-gray-500">Total Earnings</div>
          </CardContent>
        </Card>
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
                <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Mobile Money</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates?.map((aff) => (
                    <TableRow key={aff.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{aff.userName}</div>
                          <div className="text-sm text-gray-500">
                            {aff.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {aff.code}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(aff.status)}</TableCell>
                      <TableCell>{aff.totalClicks}</TableCell>
                      <TableCell>{aff.totalConversions}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(aff.totalEarnings)}
                      </TableCell>
                      <TableCell className="text-yellow-600">
                        {formatCurrency(aff.pendingEarnings)}
                      </TableCell>
                      <TableCell>
                        {aff.momoNumber ? (
                          <div>
                            <div className="text-sm">{aff.momoNumber}</div>
                            <div className="text-xs text-gray-500">
                              {aff.momoName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={aff.status}
                            onValueChange={(v) => handleStatusChange(aff.id, v)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(aff.id)}
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
