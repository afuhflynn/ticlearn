import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { levelOfStudy: true },
    });

    if (!user?.levelOfStudy) {
      redirect("/onboarding");
    }
  }

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
