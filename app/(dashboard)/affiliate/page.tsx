"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Copy,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
  CheckCircle,
  Wallet,
  Gift,
  Calendar,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ReferredUser {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  emailVerified: boolean;
}

interface Earning {
  id: string;
  referredUserEmail: string;
  plan: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
  requestedAt: string | null;
  paidAt: string | null;
}

interface AffiliateData {
  id: string;
  code: string;
  status: string;
  momoNumber: string | null;
  momoName: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  referredUsers: ReferredUser[];
  earnings: Earning[];
}

export default function AffiliatePage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in");
      return;
    }

    async function fetchAffiliate() {
      try {
        const response = await fetch("/api/affiliate");
        const data = await response.json();

        if (data.affiliate) {
          setAffiliate(data.affiliate);
          setMomoNumber(data.affiliate.momoNumber || "");
          setMomoName(data.affiliate.momoName || "");
        }
      } catch (error) {
        console.error("Failed to fetch affiliate:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchAffiliate();
    }
  }, [session, sessionLoading, router]);

  const handleSaveDetails = async () => {
    if (!momoNumber || !momoName) {
      toast.error("Please fill in both mobile money details");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/affiliate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momoNumber, momoName }),
      });
      const data = await response.json();

      if (data.success) {
        setAffiliate((prev) =>
          prev ? { ...prev, momoNumber, momoName } : null,
        );
        toast.success("Payment details saved!");
      } else {
        toast.error(data.error || "Failed to save details");
      }
    } catch {
      toast.error("Failed to save details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!affiliate?.pendingEarnings || affiliate.pendingEarnings <= 0) {
      toast.error("No pending earnings to withdraw");
      return;
    }

    setIsRequestingPayout(true);
    try {
      const response = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        const refreshRes = await fetch("/api/affiliate");
        const refreshData = await refreshRes.json();
        if (refreshData.affiliate) {
          setAffiliate(refreshData.affiliate);
        }
      } else {
        toast.error(data.error || "Failed to request payout");
      }
    } catch {
      toast.error("Failed to request payout");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/sign-up?ref__=${affiliate?.code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      case "REQUESTED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Requested
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref__=${affiliate?.code}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Affiliate Program</h1>
        <p className="text-muted-foreground">
          Earn money by referring friends to TiCLearn
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliate?.totalClicks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              People who viewed your link
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliate?.referredUsers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Users who signed up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliate?.totalConversions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Friends who subscribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              XFA {(affiliate?.totalEarnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {affiliate?.pendingEarnings
                ? `${affiliate.pendingEarnings.toLocaleString()} XFA pending`
                : "All earnings paid out"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to earn commissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={referralLink}
              className="font-mono text-sm"
            />
            <Button onClick={copyReferralLink} size="icon">
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You earn <span className="font-semibold text-primary">20%</span> of
            your referee&apos;s subscription fee for life!
          </p>
        </CardContent>
      </Card>

      {/* Your Referrals */}
      {affiliate?.referredUsers && affiliate.referredUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Users who signed up using your referral link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliate.referredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">{user.name}</td>
                      <td className="py-3 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </td>
                      <td className="py-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings History */}
      {affiliate?.earnings && affiliate.earnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>
              Your commission earnings from referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Commission (20%)</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliate.earnings.map((earning) => (
                    <tr key={earning.id} className="border-b last:border-0">
                      <td className="py-3">{earning.referredUserEmail}</td>
                      <td className="py-3">{earning.plan}</td>
                      <td className="py-3">
                        {earning.amount.toLocaleString()} XFA
                      </td>
                      <td className="py-3 font-medium text-green-600">
                        +{earning.commission.toLocaleString()} XFA
                      </td>
                      <td className="py-3">
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">{getStatusBadge(earning.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details & Payout */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Add your mobile money details to receive payouts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="momoNumber">Mobile Money Number</Label>
                <Input
                  id="momoNumber"
                  placeholder="6XXXXXXXX"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="momoName">Account Name</Label>
                <Input
                  id="momoName"
                  placeholder="Your name on Mobile Money"
                  value={momoName}
                  onChange={(e) => setMomoName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveDetails} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment Details"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Payout</CardTitle>
            <CardDescription>Withdraw your pending earnings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Earnings
                  </p>
                  <p className="text-2xl font-bold">
                    XFA {(affiliate?.pendingEarnings || 0).toLocaleString()}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    XFA {(affiliate?.paidEarnings || 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={
                isRequestingPayout ||
                !affiliate?.pendingEarnings ||
                affiliate.pendingEarnings <= 0 ||
                !affiliate?.momoNumber ||
                !affiliate?.momoName
              }
              className="w-full"
            >
              {isRequestingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Request Payout"
              )}
            </Button>
            {(!affiliate?.momoNumber || !affiliate?.momoName) && (
              <p className="text-xs text-muted-foreground text-center">
                Add your mobile money details to request a payout
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Share your referral link</p>
                <p className="text-sm text-muted-foreground">
                  Send your unique link to friends and family
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium">They subscribe</p>
                <p className="text-sm text-muted-foreground">
                  When they upgrade to Standard or Premium
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-medium">You earn 20%</p>
                <p className="text-sm text-muted-foreground">
                  Get 20% of their subscription forever
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </div>
              <div>
                <p className="font-medium">Request payout</p>
                <p className="text-sm text-muted-foreground">
                  Request payouts to your Mobile Money account
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
