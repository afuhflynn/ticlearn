"use client";

import {
  AlertCircle,
  CheckCircle,
  Copy,
  DollarSign,
  Eye,
  Link2,
  Loader2,
  Mail,
  MoreVertical,
  Plus,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQueryState, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UrlSearchInput } from "@/components/url-search-input";
import { UserCommandSelector } from "@/components/user-command-selector";
import {
  useAdminAffiliate,
  useAdminAffiliates,
  useUpdateAdminAffiliate,
} from "@/hooks/useAdmin";
import { useConfirmEarnings, useCreateAffiliate } from "@/hooks/useAffiliate";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminAffiliatesViewDefaults,
  adminAffiliatesViewParsers,
} from "@/nuqs/admin-affiliates";

export default function AdminAffiliatesPage() {
  // Search text writes with replace history. Page and the four dialogs
  // push history. The dialogs share one modal name plus the row id in
  // selectedId, so back steps out of a dialog. Create form drafts stay
  // local and never enter the URL.
  const [q, setQ] = useQueryState(
    "q",
    adminAffiliatesViewParsers.q.withOptions({ history: "replace" }),
  );
  const [view, setView] = useQueryStates(
    {
      page: adminAffiliatesViewParsers.page,
      limit: adminAffiliatesViewParsers.limit,
      modal: adminAffiliatesViewParsers.modal,
      selectedId: adminAffiliatesViewParsers.selectedId,
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
        q,
        page: safePage,
        limit: safeLimit,
        modal: view.modal,
        selectedId: view.selectedId,
      },
      adminAffiliatesViewDefaults,
    );
    if (typeof patch.q === "string" && patch.q !== q) setQ(patch.q);
    const { q: _q, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      setView(rest, { history: "replace" });
    }
  }, [
    rawParams,
    q,
    setQ,
    safePage,
    safeLimit,
    view.modal,
    view.selectedId,
    setView,
  ]);

  // A new search resets to the first page in a replace update, so the
  // back button is not polluted by the reset.
  const handleSearchCommit = (next: string) => {
    setQ(next);
    if (view.page !== 1) setView({ page: 1 }, { history: "replace" });
  };

  const closeModal = () => {
    setView({ modal: "", selectedId: "" }, { history: "replace" });
  };

  // Opening a dialog for a row id that is gone closes the dialog and
  // corrects the URL with replace history.
  useEffect(() => {
    if (view.modal !== "" && view.modal !== "create" && !view.selectedId) {
      setView({ modal: "", selectedId: "" }, { history: "replace" });
    }
  }, [view.modal, view.selectedId, setView]);

  const { affiliate: selectedAffiliate, isLoading: detailsLoading } =
    useAdminAffiliate(view.modal === "details" ? view.selectedId : "");
  const [suspendActivateStatus, setSuspendActivateStatus] =
    useState<string>("");

  // New Affiliate Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");

  const { affiliates, total, totalPages, isLoading } = useAdminAffiliates({
    search: q,
    limit: safeLimit,
    page: safePage,
  });

  const updateAffiliateMutation = useUpdateAdminAffiliate();

  const createAffiliateMutation = useCreateAffiliate();
  const { mutate: confirmEarningsMutation, isPending: isPaying } =
    useConfirmEarnings();

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedUserName("");
    setSelectedUserEmail("");
    setAffiliateCode("");
    setMomoNumber("");
    setMomoName("");
  };

  const handleUserChange = (
    userId: string,
    userName: string,
    userEmail: string,
  ) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSelectedUserEmail(userEmail);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAffiliateMutation.mutate(
      {
        userId: selectedUserId,
        code: affiliateCode,
        momoNumber,
        momoName,
      },
      {
        onSuccess() {
          closeModal();
          resetForm();
        },
      },
    );
  };

  const handleViewDetails = (id: string) => {
    setView({ modal: "details", selectedId: id });
  };

  const handlePayEarnings = (id: string) => {
    setView({ modal: "pay", selectedId: id });
  };

  const confirmPayEarnings = async () => {
    if (view.modal !== "pay" || !view.selectedId) return;
    confirmEarningsMutation(view.selectedId, {
      onSuccess() {
        closeModal();
      },
    });
  };

  const handleSuspendActivate = (id: string, currentStatus: string) => {
    setView({ modal: "suspend", selectedId: id });
    setSuspendActivateStatus(
      currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
    );
  };

  const confirmSuspendActivate = async () => {
    if (view.modal !== "suspend" || !view.selectedId) return;
    try {
      await updateAffiliateMutation.mutateAsync({
        id: view.selectedId,
        data: { status: suspendActivateStatus },
      });
      toast.success(
        suspendActivateStatus === "SUSPENDED"
          ? "Partner suspended"
          : "Partner activated",
      );
      closeModal();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update partner status",
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleGenerateCode = () => {
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `TIC-${suffix}`;
    setAffiliateCode(code);
  };

  return (
    <div className="space-y-6">
      {/* View Details Modal */}
      <Dialog
        open={view.modal === "details"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
            <DialogDescription>
              Full details and earnings history
            </DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedAffiliate ? (
            <div className="space-y-6">
              {/* Affiliate Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedAffiliate.userName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {selectedAffiliate.userEmail}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Code</Label>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {selectedAffiliate.code}
                  </code>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge
                    variant={
                      selectedAffiliate.status === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedAffiliate.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Clicks</Label>
                  <p className="font-medium">
                    {selectedAffiliate.totalClicks || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Conversions</Label>
                  <p className="font-medium">
                    {selectedAffiliate.totalConversions || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Total Earnings
                  </Label>
                  <p className="font-medium text-green-600">
                    {(selectedAffiliate.totalEarnings || 0).toLocaleString()}{" "}
                    XFA
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Pending Earnings
                  </Label>
                  <p className="font-medium text-yellow-600">
                    {(selectedAffiliate.pendingEarnings || 0).toLocaleString()}{" "}
                    XFA
                  </p>
                </div>
              </div>

              {/* Earnings History */}
              <div>
                <h4 className="font-medium mb-2">Earnings History</h4>
                {selectedAffiliate.earnings?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Email</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAffiliate.earnings.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.referredUserEmail}</TableCell>
                          <TableCell>{e.plan}</TableCell>
                          <TableCell>{e.amount} XFA</TableCell>
                          <TableCell className="text-green-600">
                            +{e.commission} XFA
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.status === "PAID"
                                  ? "default"
                                  : e.status === "REQUESTED"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {e.createdAt
                              ? new Date(e.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No earnings yet.
                  </p>
                )}
              </div>

              {/* Referrals */}
              <div>
                <h4 className="font-medium mb-2">Referrals</h4>
                {selectedAffiliate.referrals?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Converted</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAffiliate.referrals.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.referredUserEmail || "-"}</TableCell>
                          <TableCell>
                            {r.converted ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No referrals yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p>No affiliate found.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Earnings Modal */}
      <Dialog
        open={view.modal === "pay"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Pay pending earnings to this affiliate partner
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will mark all pending earnings as paid and update the
              affiliate&apos;s account.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={confirmPayEarnings} disabled={isPaying}>
              {isPaying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Activate Modal */}
      <Dialog
        open={view.modal === "suspend"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendActivateStatus === "SUSPENDED"
                ? "Suspend Partner"
                : "Activate Partner"}
            </DialogTitle>
            <DialogDescription>
              {suspendActivateStatus === "SUSPENDED"
                ? "This will suspend the affiliate partner."
                : "This will reactivate the affiliate partner."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={confirmSuspendActivate}
              variant={
                suspendActivateStatus === "SUSPENDED"
                  ? "destructive"
                  : "default"
              }
            >
              {suspendActivateStatus === "SUSPENDED" ? "Suspend" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="h-8 w-8 text-primary" />
            Affiliate Program
          </h1>
          <p className="text-muted-foreground">
            Manage your affiliate marketing program and track performance
          </p>
        </div>
        <Dialog
          open={view.modal === "create"}
          onOpenChange={(open) => {
            if (open) setView({ modal: "create" });
            else closeModal();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Affiliate Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Affiliate Link</DialogTitle>
                <DialogDescription>
                  Manually create an affiliate link for a specific user.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Select User</Label>
                  <UserCommandSelector
                    value={selectedUserId}
                    onChange={handleUserChange}
                    placeholder="Search users by name or email..."
                  />
                  {selectedUserId && (
                    <p className="text-xs text-muted-foreground">
                      Selected:{" "}
                      <span className="font-bold text-lg line-clamp-1">
                        {selectedUserName} ({selectedUserEmail})
                      </span>
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Affiliate Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g. CAMEROON2024"
                      value={affiliateCode}
                      onChange={(e) =>
                        setAffiliateCode(e.target.value.toUpperCase())
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateCode}
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="momoNumber">MoMo Number</Label>
                  <Input
                    id="momoNumber"
                    placeholder="6XXXXXXXX"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="momoName">MoMo Name</Label>
                  <Input
                    id="momoName"
                    placeholder="Full name as on MoMo"
                    value={momoName}
                    onChange={(e) => setMomoName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createAffiliateMutation.isPending}
                >
                  {createAffiliateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Link"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Affiliates
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 XAF</div>
            <p className="text-xs text-muted-foreground">
              Combined commissions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates?.reduce(
                (acc, curr) => acc + (curr.totalClicks || 0),
                0,
              ) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Across all links</p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Affiliate Partners</CardTitle>
              <CardDescription>
                Track and manage individual affiliate performance
              </CardDescription>
            </div>
            <UrlSearchInput
              value={q}
              onCommit={handleSearchCommit}
              placeholder="Search code or user..."
              ariaLabel="Search affiliates"
              className="relative w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clicks/Conv.</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates?.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {affiliate.userName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {affiliate.userEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                            {affiliate.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              copyToClipboard(
                                `https://ticlearn.com/sign-up?ref=${affiliate.code}`,
                              )
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            affiliate.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {affiliate.totalClicks || 0} clicks
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {affiliate.totalConversions || 0} conversions
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {(affiliate.totalEarnings || 0).toLocaleString()}{" "}
                            XAF
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(affiliate.pendingEarnings || 0).toLocaleString()}{" "}
                            pending
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => handleViewDetails(affiliate.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => handlePayEarnings(affiliate.id)}
                            >
                              <DollarSign className="h-4 w-4" />
                              Pay Earnings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() =>
                                handleSuspendActivate(
                                  affiliate.id,
                                  affiliate.status,
                                )
                              }
                            >
                              {affiliate.status === "ACTIVE" ? (
                                <>
                                  <AlertCircle className="h-4 w-4" />
                                  Suspend Partner
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  Activate Partner
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
    </div>
  );
}
