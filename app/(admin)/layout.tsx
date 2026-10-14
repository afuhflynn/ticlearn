import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <AdminSidebar />
        <div className="flex flex-1 flex-col h-full w-full">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
