import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ReferralProcessor } from "@/components/referral-processor";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        examProfiles: {
          select: { id: true, onboardingCompleted: true, onboardingSkipped: true },
        },
      },
    });

    if (user?.activeProfileId) {
      const activeProfile = user.examProfiles.find(
        (p) => p.id === user.activeProfileId,
      );
      if (activeProfile && !activeProfile.onboardingCompleted && !activeProfile.onboardingSkipped) {
        redirect("/onboarding");
      }
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col h-full w-full">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">{children}</main>
        </div>
      </div>
      <ReferralProcessor />
    </SidebarProvider>
  );
}
