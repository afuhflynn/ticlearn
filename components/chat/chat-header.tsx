"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@/components/user/user-button";
import { useSession } from "@/lib/auth-client";

export function ChatHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
      </div>
      {session?.user ? <UserButton user={session.user} /> : null}
    </header>
  );
}
