import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { AuthFormSkeleton } from "./auth-form-skeleton";

/**
 * The auth pages (sign in, sign up, verify email) are public and indexable,
 * per spec 0021. Their metadata lives in each server wrapper page so every
 * one carries its own title, description and canonical. This layout only
 * supplies the shared shape, the nuqs adapter and the Organization schema.
 *
 * The adapter and the boundary live here, not in the root layout. See
 * `docs/nuqs-setup.md` for why, and for what a layout created fresh needs.
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
          <OrganizationSchema />
          <div className="w-full max-w-md px-2 sm:px-0">{children}</div>
        </div>
      </NuqsAdapter>
    </Suspense>
  );
}
