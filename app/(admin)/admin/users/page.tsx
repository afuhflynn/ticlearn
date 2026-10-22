"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  MoreVertical,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
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
import { UrlSearchInput } from "@/components/url-search-input";
import { useAdminUsers } from "@/hooks/useAdmin";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminUsersViewDefaults,
  adminUsersViewParsers,
} from "@/nuqs/admin-users";
import { AdminTableSkeleton } from "../admin-skeleton";

export default function AdminUsersPage() {
  // View state lives in the URL, so refresh, back, forward, and shared
  // links reproduce the same view. Search text writes with replace
  // history; tab, filter, page, and modal changes push history.
  const [q, setQ] = useQueryState(
    "q",
    adminUsersViewParsers.q.withOptions({ history: "replace" }),
  );
  const [view, setView] = useQueryStates(
    {
      role: adminUsersViewParsers.role,
      onboarding: adminUsersViewParsers.onboarding,
      page: adminUsersViewParsers.page,
      limit: adminUsersViewParsers.limit,
      modal: adminUsersViewParsers.modal,
    },
    { history: "push" },
  );
  const safePage = clampPage(view.page);
  const safeLimit = clampLimit(view.limit);
  const isInviteOpen = view.modal === "invite";
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const rawParams = useSearchParams();

  // Raw keys that disagree with canonical values correct themselves
  // with replace history. This covers range faults (page 0) and
  // unparsable input (role bogus, which already reads as the default).
  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      {
        q,
        role: view.role,
        onboarding: view.onboarding,
        page: safePage,
        limit: safeLimit,
        modal: view.modal,
      },
      adminUsersViewDefaults,
    );
    if (typeof patch.q === "string" && patch.q !== q) setQ(patch.q);
    const next: {
      role?: "USER" | "ADMIN" | "all";
      onboarding?: "completed" | "not_completed" | "skipped" | "all";
      page?: number;
      limit?: number;
      modal?: "invite" | "";
    } = {};
    if (
      patch.role === "USER" ||
      patch.role === "ADMIN" ||
      patch.role === "all"
    ) {
      next.role = patch.role;
    }
    if (
      patch.onboarding === "completed" ||
      patch.onboarding === "not_completed" ||
      patch.onboarding === "skipped" ||
      patch.onboarding === "all"
    ) {
      next.onboarding = patch.onboarding;
    }
    if (typeof patch.page === "number") next.page = patch.page;
    if (typeof patch.limit === "number") next.limit = patch.limit;
    if (patch.modal === "invite" || patch.modal === "") {
      next.modal = patch.modal;
    }
    if (Object.keys(next).length > 0) {
      setView(next, { history: "replace" });
    }
  }, [
    rawParams,
    q,
    setQ,
    view.role,
    view.onboarding,
    view.modal,
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

  const handleRoleChange = (v: string) => {
    const role = v === "ADMIN" || v === "all" ? v : "USER";
    setView({ role, page: 1 });
  };

  const handleOnboardingChange = (v: string) => {
    const onboarding =
      v === "completed" ||
      v === "not_completed" ||
      v === "skipped" ||
      v === "all"
        ? v
        : "all";
    setView({ onboarding, page: 1 });
  };

  const queryClient = useQueryClient();

  const { users, total, totalPages, isLoading } = useAdminUsers({
    search: q,
    role: view.role,
    onboardingStatus: view.onboarding,
    limit: safeLimit,
    page: safePage,
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: async () => {
      const res = await fetch("/api/admin/invites");
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success("Invitation sent successfully");
      setView({ modal: "" }, { history: "replace" });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user roles and administrator invitations
          </p>
        </div>
        <Dialog
          open={isInviteOpen}
          onOpenChange={(open) => {
            if (open) setView({ modal: "invite" });
            else setView({ modal: "" }, { history: "replace" });
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite New Administrator</DialogTitle>
                <DialogDescription>
                  Send an invitation email to join the TiCLearn admin team. They
                  will receive a link to accept the invite.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Platform Users</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={view.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Users</SelectItem>
                    <SelectItem value="ADMIN">Admins</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={view.onboarding}
                  onValueChange={handleOnboardingChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All onboarding</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="not_completed">Incomplete</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
                <UrlSearchInput
                  value={q}
                  onCommit={handleSearchCommit}
                  placeholder="Search users..."
                  ariaLabel="Search users"
                  className="relative w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex gap-6">
              <div className="rounded-lg border bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
            {isLoading ? (
              <AdminTableSkeleton />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "ADMIN"
                                ? "destructive"
                                : "secondary"
                            }
                            className="gap-1"
                          >
                            {user.role === "ADMIN" && (
                              <Shield className="h-3 w-3" />
                            )}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.levelOfStudy ?? (
                            <Badge variant="outline">No level</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.onboardingSkipped ? (
                            <Badge variant="secondary">Skipped</Badge>
                          ) : user.onboardingCompleted ? (
                            <Badge>Completed</Badge>
                          ) : (
                            <Badge variant="outline">Incomplete</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(
                            new Date(user.createdAt),
                            "MMM d, yyyy 'at' h:mm a",
                          )}
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
                                onClick={() =>
                                  handleToggleRole(user.id, user.role)
                                }
                              >
                                {user.role === "ADMIN" ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Demote to User
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Promote to Admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                                <X className="h-4 w-4" />
                                Delete Account
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

        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Recently sent administrator invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <AdminTableSkeleton count={4} />
            ) : (
              <div className="space-y-4">
                {invitesData?.invites?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No pending invitations
                  </div>
                ) : (
                  invitesData?.invites?.map(
                    (invite: {
                      id: string;
                      email: string;
                      status: string;
                      expiresAt: string;
                    }) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {invite.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invite.status} • Exp:{" "}
                            {format(new Date(invite.expiresAt), "MMM d")}
                          </p>
                        </div>
                        <Badge
                          variant={
                            invite.status === "PENDING"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {invite.status}
                        </Badge>
                      </div>
                    ),
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
