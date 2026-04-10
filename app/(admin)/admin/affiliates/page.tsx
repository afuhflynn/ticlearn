"use client";

import { useState } from "react";
import { useAdminAffiliates, useAdminUsers } from "@/hooks/useAdmin";
import {
  Link2,
  Plus,
  Loader2,
  MoreVertical,
  ExternalLink,
  Users,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Copy,
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
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Affiliate Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");

  const queryClient = useQueryClient();

  const { affiliates, total, isLoading } = useAdminAffiliates({
    search,
  });

  const { users, isLoading: usersLoading } = useAdminUsers({
    limit: 100, // Get enough users to select from
  });

  const createAffiliateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create affiliate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success("Affiliate created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create affiliate");
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setAffiliateCode("");
    setMomoNumber("");
    setMomoName("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAffiliateMutation.mutate({
      userId: selectedUserId,
      code: affiliateCode,
      momoNumber,
      momoName,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
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
                  <Label htmlFor="user">Select User</Label>
                  <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search users..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Affiliate Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g. CAMEROON2024"
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                      required
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setAffiliateCode(Math.random().toString(36).substring(2, 8).toUpperCase())}
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
                <Button type="submit" disabled={createAffiliateMutation.isPending}>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 XAF</div>
            <p className="text-xs text-muted-foreground">Combined commissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates?.reduce((acc, curr) => acc + (curr.totalClicks || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Across all links</p>
          </CardContent>
        </Card>
      </div>

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
                        <span className="font-medium">{affiliate.userName}</span>
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
                          onClick={() => copyToClipboard(`https://ticlearn.com/sign-up?ref=${affiliate.code}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={affiliate.status === "ACTIVE" ? "default" : "secondary"}
                      >
                        {affiliate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{affiliate.totalClicks || 0} clicks</span>
                        <span className="text-xs text-muted-foreground">
                          {affiliate.totalConversions || 0} conversions
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {(affiliate.totalEarnings || 0).toLocaleString()} XAF
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(affiliate.pendingEarnings || 0).toLocaleString()} pending
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
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <ExternalLink className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <DollarSign className="h-4 w-4" />
                            Pay Earnings
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Suspend Partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
