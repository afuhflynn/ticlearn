"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  GraduationCap,
  Loader2,
  Mail,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendVerificationOTP,
  useSession,
  verifyEmailOTP,
} from "@/lib/auth-client";
import { triggerWelcomeEmail } from "@/lib/inngest/trigger";
import { searchParamsSchema } from "@/nuqs";

function VerifyEmailForm() {
  const router = useRouter();
  const [params] = useQueryStates(searchParamsSchema);
  const { email: emailParam } = params;
  const { data: session } = useSession();

  const [email, setEmail] = useState(emailParam ?? "");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (session?.user) {
      router.push("/chat");
    }
  }, [session, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await sendVerificationOTP(email);

      if (data.error) {
        setError(data.error.message || "Invalid code");
        toast.error(data.error.message || "Invalid verification code");
      } else {
        setSuccess(true);
        toast.success("Email verified successfully!");

        // Trigger welcome email for email/password users
        await triggerWelcomeEmail(email, email.split("@")[0]).catch(
          console.error,
        );

        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    } catch (err) {
      setError("Failed to send verification code");
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await verifyEmailOTP(email, otp);

      if (data.error) {
        setError(data.error.message || "Invalid code");
        toast.error(data.error.message || "Invalid verification code");
      } else {
        setSuccess(true);
        toast.success("Email verified successfully!");

        // Trigger welcome email for email/password users
        await triggerWelcomeEmail(email, email.split("@")[0]).catch(
          console.error,
        );

        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    } catch (err) {
      setError("Invalid verification code");
      toast.error("Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Email Verified!</CardTitle>
              <CardDescription>
                Your email has been verified successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Redirecting you to sign in...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!isVerifying) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-2">
            <CardHeader className="text-center">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/icons/favicon-32x32.png"
                  alt="TiCLearn Logo"
                  className="h-8 w-8 text-primary"
                />
                <span className="text-xl font-bold">TiCLearn</span>
              </Link>
              <CardTitle className="text-2xl">Verify Your Email</CardTitle>
              <CardDescription>
                Enter your email to receive a verification code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOtp} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="text-center text-sm text-muted-foreground">
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="w-full flex items-center justify-center py-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/icons/favicon-32x32.png"
                  alt="TiCLearn Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 text-primary"
                />
                <span className="text-xl font-bold">TiCLearn</span>
              </Link>
            </div>
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              We&apos;ve sent a 6-digit code to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length < 6}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setIsVerifying(false);
                  setError("");
                }}
              >
                Change email
              </button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={async () => {
                  try {
                    const data = await sendVerificationOTP(email);
                    if (!data.error) {
                      toast.success("Verification code resent!");
                    }
                  } catch {
                    toast.error("Failed to resend code");
                  }
                }}
              >
                Resend code
              </button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
