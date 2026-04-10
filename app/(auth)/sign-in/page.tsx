"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryStates } from "nuqs";
import { searchParamsSchema } from "@/nuqs";

export default function SignInPage() {
  const router = useRouter();
  const [params] = useQueryStates(searchParamsSchema);
  const { callbackUrl, error: searchError } = params;
  const { data: session, isPending: sessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  useEffect(() => {
    if (searchError === "google_sign_in_failed") {
      setError("Google sign in failed. Please try again.");
      toast.error("Google sign in failed");
    }
  }, [searchError]);

  useEffect(() => {
    if (!sessionLoading && session?.user) {
      router.push(callbackUrl ?? "/dashboard");
    }
  }, [session, sessionLoading, router, callbackUrl]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setShowVerificationPrompt(false);
    const result = await signIn.email({
      email,
      password,
      fetchOptions: {
        onError(context) {
          if (context.error) {
            if (context.error.code === "EMAIL_NOT_VERIFIED") {
              setShowVerificationPrompt(true);
              setError("Please verify your email first");
            } else {
              setError(context.error.message || "Invalid credentials");
            }
          }
        },
        onSuccess() {
          router.push(callbackUrl ?? "/dashboard"); // @todo: Make this better later
        },
      },
    });
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: callbackUrl ?? "/dashboard",
        errorCallbackURL: "/sign-in?error=google_sign_in_failed",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(
        "/api/auth/email-otp/send-verification-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, type: "email-verification" }),
        },
      );
      const data = await response.json();

      if (data.error) {
        toast.error(data.error.message || "Failed to resend code");
      } else {
        toast.success("Verification code sent!");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch {
      toast.error("Failed to resend code");
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <Link
              href="/"
              className="mx-auto mb-4 flex items-center justify-center gap-2"
            >
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">TiCLearn</span>
            </Link>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {showVerificationPrompt && (
                <div className="rounded-md bg-primary/10 p-4 text-sm">
                  <p className="mb-3 text-foreground">
                    Your email is not verified yet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleResendVerification}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Verify Email
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                    disabled={showVerificationPrompt}
                  />
                </div>
              </div>

              {!showVerificationPrompt && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-sm">
                    <Link
                      href="/forgot-password"
                      className="text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || showVerificationPrompt}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>Google</title>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
