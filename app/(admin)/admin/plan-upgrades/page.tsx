"use client";

import { format } from "date-fns";
import {
  ArrowDownUp,
  CheckCircle2,
  CreditCard,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
import {
  type AdminPlanUser,
  useAdminPlanUsers,
  useUpdateAdminUserPlan,
} from "@/hooks/useAdmin";

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
  if (!user.activeProfileId) return "No profile";
  if (user.onboardingSkipped) return "Skipped";
  if (user.onboardingCompleted) return "Completed";
  return "Incomplete";
}

function getOnboardingVariant(user: AdminPlanUser) {
  const label = getOnboardingLabel(user);
  if (label === "Completed") return "default" as const;
  if (label === "Skipped") return "secondary" as const;
  if (label === "No profile") return "destructive" as const;
  return "outline" as const;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

export default function AdminPlanUpgradesPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("USER");
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminPlanUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [reason, setReason] = useState("");

  const params = useMemo(
    () => ({
      search,
      role: roleFilter,
      onboardingStatus: onboardingFilter,
      plan: planFilter,
      subscriptionStatus: statusFilter,
      limit: 20,
      page,
    }),
    [search, roleFilter, onboardingFilter, planFilter, statusFilter, page],
  );

  const { users, total, totalPages, isLoading, isFetching } =
    useAdminPlanUsers(params);
  const updatePlanMutation = useUpdateAdminUserPlan();

  const resetToFirstPage = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const openPlanDialog = (user: AdminPlanUser) => {
    setSelectedUser(user);
    setSelectedPlan(user.currentPlan);
    setReason("");
  };

  const confirmPlanChange = async () => {
    if (!selectedUser) return;
    try {
      await updatePlanMutation.mutateAsync({
        userId: selectedUser.id,
        plan: selectedPlan,
        reason: reason.trim() || undefined,
      });
      toast.success(
        `${selectedUser.name || selectedUser.email} moved to ${PLAN_LABELS[selectedPlan]}`,
      );
      setSelectedUser(null);
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
            <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
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
                value={roleFilter}
                onValueChange={(value) =>
                  resetToFirstPage(setRoleFilter, value)
                }
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
                value={onboardingFilter}
                onValueChange={(value) =>
                  resetToFirstPage(setOnboardingFilter, value)
                }
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
                value={planFilter}
                onValueChange={(value) =>
                  resetToFirstPage(setPlanFilter, value)
                }
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
                value={statusFilter}
                onValueChange={(value) =>
                  resetToFirstPage(setStatusFilter, value)
                }
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
              <div className="relative md:col-span-2 xl:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                                Step {user.onboardingStep ?? 0} ·{" "}
                                {user.phoneCountryCode || ""}{" "}
                                {user.phoneNumber || "No phone"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Exam: {formatDate(user.examDate)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-56 space-y-1">
                              {user.programs.length ? (
                                user.programs.slice(0, 2).map((program) => (
                                  <Badge key={program.id} variant="secondary">
                                    {program.code}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  No programs
                                </span>
                              )}
                              {user.programs.length > 2 ? (
                                <div className="text-xs text-muted-foreground">
                                  +{user.programs.length - 2} more
                                </div>
                              ) : null}
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
                              {user.attemptsCount} quiz attempts ·{" "}
                              {user.paper3AttemptsCount} Paper 3
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
                  Page {page} of {Math.max(totalPages, 1)} · {total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change user plan</DialogTitle>
            <DialogDescription>
              Upgrade, downgrade, or move this user back to the free plan. Paid
              plans are activated immediately.
            </DialogDescription>
          </DialogHeader>
          {selectedUser ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4">
                <div className="font-medium">
                  {selectedUser.name || selectedUser.email}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant={PLAN_BADGE_VARIANTS[selectedUser.currentPlan]}
                  >
                    Current: {PLAN_LABELS[selectedUser.currentPlan]}
                  </Badge>
                  <Badge variant={getOnboardingVariant(selectedUser)}>
                    {getOnboardingLabel(selectedUser)}
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
              {selectedPlan === selectedUser.currentPlan ? (
                <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                  <XCircle className="h-4 w-4" />
                  Select a different plan before submitting.
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmPlanChange}
              disabled={
                updatePlanMutation.isPending ||
                !selectedUser ||
                selectedPlan === selectedUser.currentPlan
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
