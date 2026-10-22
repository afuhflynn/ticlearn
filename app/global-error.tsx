"use client";

import * as Sentry from "@sentry/nextjs";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif",
          background: "oklch(0.994 0 0)",
          color: "oklch(0 0 0)",
          margin: 0,
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              maxWidth: "28rem",
              color: "oklch(0.4386 0 0)",
            }}
          >
            The app could not be shown. Try again and if it keeps happening,
            reload the page.
          </p>
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
