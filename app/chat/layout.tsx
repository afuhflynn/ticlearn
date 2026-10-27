import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { noIndex } from "@/lib/metadata";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * A shell, not a gate. Same rule as the dashboard layout: no session, no
 * cookie, no database, no redirect. The gate is in `proxy.ts`.
 *
 * There is no top bar. The brand, new chat, search and account live in the
 * sidebar, so a top bar would repeat the same actions. Only the mobile
 * drawer trigger floats free, the way the dashboard's mobile trigger does.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <ChatSidebar />
      <SidebarInset className="h-svh min-h-svh overflow-hidden">
        <SidebarTrigger className="fixed top-3 left-3 z-50 size-10 max-md:border max-md:bg-background/80 max-md:backdrop-blur max-md:[&_svg]:size-5 md:hidden" />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
