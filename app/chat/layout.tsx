import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { noIndex } from "@/lib/metadata";

export const metadata: Metadata = {
  ...noIndex,
};

/**
 * A shell, not a gate. Same rule as the dashboard layout: no session, no
 * cookie, no database, no redirect. The gate is in `proxy.ts`.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <ChatSidebar />
      <SidebarInset className="h-svh min-h-svh overflow-hidden">
        <ChatHeader />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
