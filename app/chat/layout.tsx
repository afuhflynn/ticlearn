import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { IncompleteProfileBanner } from "@/components/chat/IncompleteProfileBanner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function ChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        examProfiles: {
          select: {
            id: true,
            onboardingCompleted: true,
            onboardingSkipped: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (user?.activeProfileId) {
      const activeProfile = user.examProfiles.find(
        (p) => p.id === user.activeProfileId,
      );
      if (activeProfile && !activeProfile.onboardingSkipped) {
        const missingRequiredPhone = !activeProfile.phoneNumber;
        if (!activeProfile.onboardingCompleted || missingRequiredPhone) {
          redirect("/onboarding");
        }
      }
    } else {
      redirect("/onboarding");
    }
  }

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
