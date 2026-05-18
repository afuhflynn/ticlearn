import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReactNode } from "react";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
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
      if (activeProfile?.onboardingCompleted) {
        redirect("/dashboard");
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
