"use client";

import { BookOpen, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@/components/user/user-button";
import { useSession } from "@/lib/auth-client";

export function ChatHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/practice">
              <BookOpen className="mr-2 h-4 w-4" />
              Practice
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href="/chat">
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Link>
        </Button>
        {session?.user ? <UserButton user={session.user} /> : null}
      </div>
    </header>
  );
}
