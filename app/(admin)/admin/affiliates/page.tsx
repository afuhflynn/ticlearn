"use client";

import { useState } from "react";
import {
  useAdminAffiliates,
  useAdminAffiliate,
  useUpdateAdminAffiliate,
} from "@/hooks/useAdmin";
import { UserCommandSelector } from "@/components/user-command-selector";
import {
  Link2,
  Plus,
  Loader2,
  MoreVertical,
  Users,
  Search,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Copy,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useConfirmEarnings, useCreateAffiliate } from "@/hooks/useAffiliate";

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // View Details modal
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const { affiliate: selectedAffiliate, isLoading: detailsLoading } =
    useAdminAffiliate(viewDetailsId || "");

  // Pay Earnings modal
  const [payEarningsId, setPayEarningsId] = useState<string | null>(null);

  // Suspend/Activate modal
  const [suspendActivateId, setSuspendActivateId] = useState<string | null>(
    null,
  );
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
    search,
    limit: 20,
    page,
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
          setIsCreateOpen(false);
          resetForm();
        },
      },
    );
  };

  const handleViewDetails = (id: string) => {
    setViewDetailsId(id);
  };

  const handlePayEarnings = (id: string) => {
    setPayEarningsId(id);
  };

  const confirmPayEarnings = async () => {
    if (!payEarningsId) return;
    confirmEarningsMutation(payEarningsId, {
      onSuccess() {
        setPayEarningsId(null);
      },
    });
  };

  const handleSuspendActivate = (id: string, currentStatus: string) => {
    setSuspendActivateId(id);
    setSuspendActivateStatus(
      currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
    );
  };

  const confirmSuspendActivate = async () => {
    if (!suspendActivateId) return;
    try {
      await updateAffiliateMutation.mutateAsync({
        id: suspendActivateId,
        data: { status: suspendActivateStatus },
      });
      toast.success(
        suspendActivateStatus === "SUSPENDED"
          ? "Partner suspended"
          : "Partner activated",
      );
      setSuspendActivateId(null);
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
        open={!!viewDetailsId}
        onOpenChange={() => setViewDetailsId(null)}
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
            <Button variant="outline" onClick={() => setViewDetailsId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Earnings Modal */}
      <Dialog
        open={!!payEarningsId}
        onOpenChange={() => setPayEarningsId(null)}
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
            <Button variant="outline" onClick={() => setPayEarningsId(null)}>
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
        open={!!suspendActivateId}
        onOpenChange={() => setSuspendActivateId(null)}
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
            <Button
              variant="outline"
              onClick={() => setSuspendActivateId(null)}
            >
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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search code or user..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
