"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex w-full min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mb-4 text-2xl font-semibold">Something went wrong</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        This page could not be shown. Nothing you did is lost, so try again and
        if it keeps happening go back to the dashboard.
      </p>
      <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
        <Button onClick={reset} variant="outline" className="w-full md:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild className="w-full font-sans md:w-auto">
          <Link href="/" className="flex flex-row items-center justify-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
