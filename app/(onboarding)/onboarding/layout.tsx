import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noIndex } from "@/lib/metadata";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * A shell, not a gate. The inverse check that kept finished students out of
 * onboarding is in `proxy.ts`, so this layout paints its background
 * immediately.
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
