"use client";

import { SquarePen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserButton } from "@/components/user/user-button";
import { useSession } from "@/lib/auth-client";

/**
 * A quiet top bar. The trigger restores the sidebar, the pen starts a new
 * chat, and the account sits on the right. Everything else lives in the
 * sidebar, so the reading column stays the loudest thing on screen.
 */
export function ChatHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-3 backdrop-blur md:px-4">
      <div className="flex items-center gap-1">
        <SidebarTrigger />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild className="size-9" size="icon" variant="ghost">
                <Link href="/chat">
                  <SquarePen className="size-4" />
                  <span className="sr-only">New chat</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2">
        {session?.user ? <UserButton user={session.user} /> : null}
      </div>
    </header>
  );
}
