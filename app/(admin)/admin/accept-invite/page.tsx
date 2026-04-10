"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, isPending: sessionLoading } = useSession();
  
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No invitation token found.");
      return;
    }

    if (!sessionLoading) {
      if (!session) {
        // Redirect to sign up/in with return URL
        const returnUrl = encodeURIComponent(`/admin/accept-invite?token=${token}`);
        router.push(`/sign-up?callbackUrl=${returnUrl}`);
        return;
      }
      setStatus("ready");
    }
  }, [token, session, sessionLoading, router]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      setStatus("success");
      toast.success("Welcome to the Admin Team!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === "loading" || sessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Invitation</CardTitle>
            <CardDescription>
              Accept your invitation to join the TiCLearn administrator team
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            {status === "ready" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You are signed in as <span className="font-semibold text-foreground">{session?.user.email}</span>. 
                  Click below to accept the invitation and gain administrative access.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-lg font-medium">Access Granted!</p>
                <p className="text-muted-foreground">
                  Your account has been upgraded to Administrator. You now have access to the admin dashboard.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-lg font-medium text-destructive">Invitation Error</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
            )}
          </CardContent>

          <CardFooter>
            {status === "ready" && (
              <Button 
                onClick={handleAccept} 
                className="w-full" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            )}

            {status === "success" && (
              <Button onClick={() => router.push("/admin")} className="w-full">
                Go to Admin Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {status === "error" && (
              <Button onClick={() => router.push("/")} variant="outline" className="w-full">
                Back to Home
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
