"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth-client";
import { PlanBadge } from "../plan-badge";
import { UserButton } from "../user/user-button";

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 w-full justify-between">
      <SidebarTrigger />

      <div className="flex items-center gap-2">
        <PlanBadge />

        <UserButton user={session?.user!} />
      </div>
    </header>
  );
}
