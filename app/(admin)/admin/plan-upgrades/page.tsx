"use client";

import { format } from "date-fns";
import {
  ArrowDownUp,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  UserRound,
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
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { UrlSearchInput } from "@/components/url-search-input";
import {
  type AdminPlanUser,
  useAdminPlanUsers,
  useUpdateAdminUserPlan,
} from "@/hooks/useAdmin";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminPlanUpgradesViewDefaults,
  adminPlanUpgradesViewParsers,
} from "@/nuqs/admin-plan-upgrades";
import { AdminTableSkeleton } from "../admin-skeleton";

const PLAN_OPTIONS = ["FREE", "STARTER", "STANDARD", "PREMIUM", "PRO"];
const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  PRO: "Pro",
};
const PLAN_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  FREE: "outline",
  STARTER: "secondary",
  STANDARD: "default",
  PREMIUM: "default",
  PRO: "default",
};

function getOnboardingLabel(user: AdminPlanUser) {
  if (user.onboardingSkipped) return "Skipped";
  if (user.onboardingCompleted) return "Completed";
  return "Incomplete";
}

function getOnboardingVariant(user: AdminPlanUser) {
  const label = getOnboardingLabel(user);
  if (label === "Completed") return "default" as const;
  if (label === "Skipped") return "secondary" as const;
  return "outline" as const;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

export default function AdminPlanUpgradesPage() {
  // Search, filters, page, and the change plan dialog live in the
  // URL, so refresh, back, forward, and shared links reproduce the
  // same view. Search text writes with replace history, the rest
  // pushes. The picked plan and the reason stay local drafts.
  const [q, setQ] = useQueryState(
    "q",
    adminPlanUpgradesViewParsers.q.withOptions({ history: "replace" }),
  );
  const [view, setView] = useQueryStates(
    {
      role: adminPlanUpgradesViewParsers.role,
      onboarding: adminPlanUpgradesViewParsers.onboarding,
      plan: adminPlanUpgradesViewParsers.plan,
      status: adminPlanUpgradesViewParsers.status,
      page: adminPlanUpgradesViewParsers.page,
      limit: adminPlanUpgradesViewParsers.limit,
      modal: adminPlanUpgradesViewParsers.modal,
      selectedId: adminPlanUpgradesViewParsers.selectedId,
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
        role: view.role,
        onboarding: view.onboarding,
        plan: view.plan,
        status: view.status,
        page: safePage,
        limit: safeLimit,
        modal: view.modal,
        selectedId: view.selectedId,
      },
      adminPlanUpgradesViewDefaults,
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
    view.role,
    view.onboarding,
    view.plan,
    view.status,
    view.modal,
    view.selectedId,
    safePage,
    safeLimit,
    setView,
  ]);

  // A new search resets to the first page in a replace update, so the
  // back button is not polluted by the reset.
  const handleSearchCommit = (next: string) => {
    setQ(next);
    if (view.page !== 1) setView({ page: 1 }, { history: "replace" });
  };

  const { users, total, totalPages, isLoading, isFetching } = useAdminPlanUsers(
    {
      search: q,
      role: view.role,
      onboardingStatus: view.onboarding,
      plan: view.plan,
      subscriptionStatus: view.status,
      limit: safeLimit,
      page: safePage,
    },
  );
  const updatePlanMutation = useUpdateAdminUserPlan();

  // The dialog renders the row from the loaded list by id, so a shared
  // link reproduces it whenever the row is on the current view. The
  // picked plan and the reason stay local drafts, reseeded whenever
  // the dialog row changes.
  const dialogUser = users.find((user) => user.id === view.selectedId) ?? null;
  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (dialogUser) {
      setSelectedPlan(dialogUser.currentPlan);
      setReason("");
    }
  }, [dialogUser]);

  // A dialog id with no row behind it (stale link, or filters that
  // hide the row) closes the dialog and corrects the URL, once the
  // list has loaded.
  useEffect(() => {
    if (view.modal === "change" && !isLoading && !dialogUser) {
      setView({ modal: "", selectedId: "" }, { history: "replace" });
    }
  }, [view.modal, isLoading, dialogUser, setView]);

  const closePlanDialog = () => {
    setView({ modal: "", selectedId: "" }, { history: "replace" });
  };

  const resetToFirstPage = (
    patch:
      | { role: "USER" | "ADMIN" | "all" }
      | { onboarding: "completed" | "not_completed" | "skipped" | "all" }
      | { plan: "FREE" | "STARTER" | "STANDARD" | "PREMIUM" | "PRO" | "all" }
      | { status: "all" | "ACTIVE" | "PENDING" | "FAILED" },
  ) => {
    setView({ ...patch, page: 1 });
  };

  const openPlanDialog = (user: AdminPlanUser) => {
    setView({ modal: "change", selectedId: user.id });
  };

  const confirmPlanChange = async () => {
    if (!dialogUser) return;
    try {
      await updatePlanMutation.mutateAsync({
        userId: dialogUser.id,
        plan: selectedPlan,
        reason: reason.trim() || undefined,
      });
      toast.success(
        `${dialogUser.name || dialogUser.email} moved to ${PLAN_LABELS[selectedPlan]}`,
      );
      closePlanDialog();
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user plan",
      );
    }
  };

  const activeCount = users.filter(
    (user) => user.currentPlan !== "FREE",
  ).length;
  const completedCount = users.filter(
    (user) => user.onboardingCompleted,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <CreditCard className="h-8 w-8 text-primary" />
            Plan Upgrades
          </h1>
          <p className="text-muted-foreground">
            Search users, review onboarding context, and safely upgrade or
            downgrade subscription plans.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <Badge variant="outline" className="gap-2 self-start md:self-auto">
            Refreshing
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total matching users</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid plans on this page</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <ShieldCheck className="h-6 w-6 text-primary" /> {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed onboarding on this page</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {completedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>User Plans</CardTitle>
              <CardDescription>
                Plan changes are validated server-side and audited as KPI
                events.
              </CardDescription>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:flex xl:items-center">
              <Select
                value={view.role}
                onValueChange={(value) => {
                  if (
                    value === "USER" ||
                    value === "ADMIN" ||
                    value === "all"
                  ) {
                    resetToFirstPage({ role: value });
                  }
                }}
              >
                <SelectTrigger className="w-full xl:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                  <SelectItem value="all">All roles</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={view.onboarding}
                onValueChange={(value) => {
                  if (
                    value === "completed" ||
                    value === "not_completed" ||
                    value === "skipped" ||
                    value === "all"
                  ) {
                    resetToFirstPage({ onboarding: value });
                  }
                }}
              >
                <SelectTrigger className="w-full xl:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All onboarding</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="not_completed">Incomplete</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={view.plan}
                onValueChange={(value) => {
                  if (
                    value === "FREE" ||
                    value === "STARTER" ||
                    value === "STANDARD" ||
                    value === "PREMIUM" ||
                    value === "PRO" ||
                    value === "all"
                  ) {
                    resetToFirstPage({ plan: value });
                  }
                }}
              >
                <SelectTrigger className="w-full xl:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {PLAN_LABELS[plan]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={view.status}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "ACTIVE" ||
                    value === "PENDING" ||
                    value === "FAILED"
                  ) {
                    resetToFirstPage({ status: value });
                  }
                }}
              >
                <SelectTrigger className="w-full xl:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <div className="md:col-span-2 xl:w-72">
                <UrlSearchInput
                  value={q}
                  onCommit={handleSearchCommit}
                  placeholder="Search users..."
                  ariaLabel="Search users"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AdminTableSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead>Programs</TableHead>
                      <TableHead>Current plan</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No users match these filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-muted p-2">
                                <UserRound className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.name || "Unnamed user"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={getOnboardingVariant(user)}>
                                {getOnboardingLabel(user)}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Level: {user.levelOfStudy ?? "Not set"}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant={PLAN_BADGE_VARIANTS[user.currentPlan]}
                              >
                                {PLAN_LABELS[user.currentPlan] ||
                                  user.currentPlan}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {user.subscription?.status || "No subscription"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.notesCount} notes · {user.quizzesCount}{" "}
                              quizzes
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.attemptsCount} quiz attempts
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPlanDialog(user)}
                            >
                              <ArrowDownUp className="mr-2 h-4 w-4" />
                              Change Plan
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {Math.max(totalPages, 1)} · {total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setView({ page: safePage - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={safePage >= totalPages}
                    onClick={() => setView({ page: safePage + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={view.modal === "change" && dialogUser !== null}
        onOpenChange={(open) => {
          if (!open) closePlanDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change user plan</DialogTitle>
            <DialogDescription>
              Upgrade, downgrade, or move this user back to the free plan. Paid
              plans are activated immediately.
            </DialogDescription>
          </DialogHeader>
          {dialogUser ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4">
                <div className="font-medium">
                  {dialogUser.name || dialogUser.email}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dialogUser.email}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={PLAN_BADGE_VARIANTS[dialogUser.currentPlan]}>
                    Current: {PLAN_LABELS[dialogUser.currentPlan]}
                  </Badge>
                  <Badge variant={getOnboardingVariant(dialogUser)}>
                    {getOnboardingLabel(dialogUser)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">New plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((plan) => (
                      <SelectItem key={plan} value={plan}>
                        {PLAN_LABELS[plan]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason / admin note</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Optional note for the audit trail"
                />
              </div>
              {selectedPlan === dialogUser.currentPlan ? (
                <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                  <XCircle className="h-4 w-4" />
                  Select a different plan before submitting.
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closePlanDialog}>
              Cancel
            </Button>
            <Button
              onClick={confirmPlanChange}
              disabled={
                updatePlanMutation.isPending ||
                !dialogUser ||
                selectedPlan === dialogUser.currentPlan
              }
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating
                </>
              ) : (
                "Confirm change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
