"use client";

import {
  Check,
  CreditCard,
  Download,
  Edit,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
  useAdminSubscriptions,
  useDeleteAdminSubscription,
  useUpdateAdminSubscription,
} from "@/hooks/useAdmin";
import { useSession } from "@/lib/auth-client";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminSubscriptionsViewDefaults,
  adminSubscriptionsViewParsers,
} from "@/nuqs/admin-subscriptions";
import { AdminTableSkeleton } from "../admin-skeleton";

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter", price: 3000 },
  { value: "STANDARD", label: "Standard", price: 5000 },
  { value: "PREMIUM", label: "Premium", price: 10000 },
];

export default function AdminSubscriptionsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  // Status filter, page, and the change plan dialog live in the URL,
  // so refresh, back, forward, and shared links reproduce the same
  // view. The picked plan stays a local draft inside the dialog.
  const [view, setView] = useQueryStates(
    {
      status: adminSubscriptionsViewParsers.status,
      page: adminSubscriptionsViewParsers.page,
      limit: adminSubscriptionsViewParsers.limit,
      modal: adminSubscriptionsViewParsers.modal,
      selectedId: adminSubscriptionsViewParsers.selectedId,
    },
    { history: "push" },
  );
  const safePage = clampPage(view.page);
  const safeLimit = clampLimit(view.limit);
  const isChangePlanOpen = view.modal === "change";
  const [newPlan, setNewPlan] = useState("STARTER");
  const rawParams = useSearchParams();

  // Raw keys that disagree with canonical values correct themselves
  // with replace history.
  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      {
        status: view.status,
        page: safePage,
        limit: safeLimit,
        modal: view.modal,
        selectedId: view.selectedId,
      },
      adminSubscriptionsViewDefaults,
    );
    if (Object.keys(patch).length > 0) {
      setView(patch, { history: "replace" });
    }
  }, [
    rawParams,
    view.status,
    view.modal,
    view.selectedId,
    safePage,
    safeLimit,
    setView,
  ]);

  // Opening the dialog for a row id that is gone closes the dialog
  // and corrects the URL with replace history.
  useEffect(() => {
    if (view.modal === "change" && !view.selectedId) {
      setView({ modal: "", selectedId: "" }, { history: "replace" });
    }
  }, [view.modal, view.selectedId, setView]);

  const { subscriptions, totalPages, isLoading, refetch } =
    useAdminSubscriptions({
      page: safePage,
      limit: safeLimit,
      status: view.status === "all" ? undefined : view.status,
    });

  const updateMutation = useUpdateAdminSubscription();
  const deleteMutation = useDeleteAdminSubscription();

  const handleActivate = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: "ACTIVE" },
      });
      toast.success("Subscription activated");
      refetch();
    } catch (_error) {
      toast.error("Failed to activate subscription");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this payment?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Payment rejected");
      refetch();
    } catch (_error) {
      toast.error("Failed to reject payment");
    }
  };

  const handleChangePlan = async () => {
    if (!view.selectedId) return;
    try {
      await updateMutation.mutateAsync({
        id: view.selectedId,
        data: { status: "ACTIVE", plan: newPlan },
      });
      toast.success("Plan changed and activated");
      setView({ modal: "", selectedId: "" }, { history: "replace" });
      refetch();
    } catch (_error) {
      toast.error("Failed to change plan");
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
    return <AdminTableSkeleton count={10} />;
  }

  if (!session?.user || (session.user as { role?: string })?.role !== "ADMIN") {
    router.push("/");
    return null;
  }

  const getStatusBadge = (s: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-500",
      FAILED: "bg-red-500",
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

  const getPlanLabel = (p: string) => {
    const plan = PLAN_OPTIONS.find((o) => o.value === p);
    return plan ? plan.label : p;
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
            <Select
              value={view.status}
              onValueChange={(v) => {
                if (
                  v === "all" ||
                  v === "PENDING" ||
                  v === "ACTIVE" ||
                  v === "FAILED"
                ) {
                  setView({ status: v, page: 1 });
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FAILED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {sub.userName || "N/A"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sub.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanLabel(sub.plan)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {sub.fapshiTransId || "N/A"}
                        </code>
                      </TableCell>
                      <TableCell>
                        {sub.amount
                          ? `${sub.amount.toLocaleString()} XAF`
                          : "Free"}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sub.status === "PENDING" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => handleActivate(sub.id)}
                                className="text-green-600"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReject(sub.id)}
                                className="text-red-600"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setNewPlan(sub.plan);
                                  setView({
                                    modal: "change",
                                    selectedId: sub.id,
                                  });
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Change Plan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : sub.status === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(sub.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
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

      <Dialog
        open={isChangePlanOpen}
        onOpenChange={(open) => {
          if (open) setView({ modal: "change" });
          else setView({ modal: "", selectedId: "" }, { history: "replace" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Select a new plan before activating this subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Select Plan</Label>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((plan) => (
                  <SelectItem key={plan.value} value={plan.value}>
                    {plan.label} - {plan.price.toLocaleString()} XAF
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setView({ modal: "", selectedId: "" }, { history: "replace" })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleChangePlan}>Activate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
