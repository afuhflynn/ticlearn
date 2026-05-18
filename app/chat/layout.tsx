import type { ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { IncompleteProfileBanner } from "@/components/chat/IncompleteProfileBanner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <ChatSidebar />
      <SidebarInset className="h-svh min-h-svh overflow-hidden">
        <ChatHeader />
        <IncompleteProfileBanner />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
