import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { RootFallback } from "@/components/layout/RootFallback";
import { SidebarProvider } from "@/components/ui/sidebar";
import { noIndex } from "@/lib/metadata";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * A shell, not a gate. The role check that duplicated `proxy.ts` is gone; the
 * proxy is the single place that decides whether a session may reach /admin.
 *
 * The nuqs adapter and the boundary live here, not in the root layout. See
 * `docs/nuqs-setup.md` for why, and for what a layout created fresh needs.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RootFallback />}>
      <NuqsAdapter>
        <SidebarProvider>
          <div className="flex min-h-screen w-screen">
            <AdminSidebar />
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
