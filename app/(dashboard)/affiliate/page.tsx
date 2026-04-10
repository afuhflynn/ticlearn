"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Copy,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
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
}

export default function AffiliatePage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
        setAffiliate(data.affiliate);
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

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/sign-up?ref__=${affiliate?.code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
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
      <div className="grid gap-4 md:grid-cols-3">
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
                ? `XFA ${affiliate.pendingEarnings.toLocaleString()} pending`
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

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Add your mobile money details to receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                <p className="font-medium">Get paid monthly</p>
                <p className="text-sm text-muted-foreground">
                  Payouts sent to your Mobile Money account
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
