import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { noIndex } from "@/lib/metadata";
import { AuthFormSkeleton } from "./auth-form-skeleton";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * The nuqs adapter and the boundary live here, not in the root layout. See
 * `docs/nuqs-setup.md` for why, and for what a layout created fresh needs.
 *
 * The fallback is the shape of an auth form, so the student sees the form's
 * outline at once while the session and the search params resolve.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <NuqsAdapter>
        <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
          <div className="w-full max-w-md px-2 sm:px-0">{children}</div>
        </div>
      </NuqsAdapter>
    </Suspense>
  );
}
