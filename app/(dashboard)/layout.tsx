import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ReferralProcessor } from "@/components/referral-processor";

const PUBLIC_PATHS = ["/api/", "/sign-in", "/sign-up", "/sign-out", "/onboarding"];

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
          select: { id: true, onboardingCompleted: true },
        },
      },
    });

    if (user?.activeProfileId) {
      const activeProfile = user.examProfiles.find(
        (p) => p.id === user.activeProfileId,
      );

      if (activeProfile && !activeProfile.onboardingCompleted) {
        redirect("/onboarding");
      }
    } else if (user) {
      // Auto-create profile for users without one (older accounts)
      const unknownProgram = await prisma.program.findUnique({
        where: { code: "UNKNOWN" },
      });
      if (unknownProgram) {
        const gceAL = await prisma.examLevel.findFirst({ orderBy: { createdAt: "asc" } });
        if (gceAL) {
          const profile = await prisma.examProfile.create({
            data: {
              userId: user.id,
              programId: unknownProgram.id,
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { activeProfileId: profile.id },
          });
          redirect("/onboarding");
        }
      }
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
