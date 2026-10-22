import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { RootFallback } from "@/components/layout/RootFallback";
import { SidebarProvider } from "@/components/ui/sidebar";
import { noIndex } from "@/lib/metadata";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * A shell, not a gate. It reads no session, no cookie and no database, so the
 * sidebar and header paint on the first flush and the page segment streams
 * behind them. The onboarding redirect that used to live here is in
 * `proxy.ts`, which is the only place that can answer before the first byte.
 *
 * The nuqs adapter and the boundary live here, not in the root layout. See
 * `docs/nuqs-setup.md` for why, and for what a layout created fresh needs.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RootFallback />}>
      <NuqsAdapter>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col h-full w-full">
              <DashboardHeader />
              <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
