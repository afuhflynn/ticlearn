"use client";

import { CreditCard, Link2, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdminStats } from "@/hooks/useAdmin";
import { useSession } from "@/lib/auth-client";
import { AdminDashboardSkeleton } from "./admin-skeleton";

const navItems = [
  {
    title: "Users",
    icon: Users,
    href: "/admin/users",
    description: "Manage user accounts and roles",
  },
  {
    title: "Subscriptions",
    icon: CreditCard,
    href: "/admin/subscriptions",
    description: "View and manage subscriptions",
  },
  {
    title: "Platform & credits",
    icon: Shield,
    href: "/admin/platform-settings",
    description:
      "Credit costs, pay-as-you-go rates (XAF → credits), and enforcement toggles.",
  },
  {
    title: "Affiliates",
    icon: Link2,
    href: "/admin/affiliates",
    description: "Manage affiliate program",
  },
];

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { stats, isLoading: statsLoading } = useAdminStats();

  const statsItems = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? "0",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions?.toString() ?? "0",
      icon: CreditCard,
      href: "/admin/subscriptions",
    },
    {
      title: "Pending Affiliates",
      value: stats?.pendingAffiliates?.toString() ?? "0",
      icon: Link2,
      href: "/admin/affiliates",
    },
  ];

  if (isPending || statsLoading) {
    return <AdminDashboardSkeleton />;
  }

  const userRole = (session?.user as { role?: string })?.role;
  if (!session || userRole !== "ADMIN") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-destructive" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your platform and monitor activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsItems.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="rounded-full bg-muted p-3">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {navItems.map((item) => (
          <Card key={item.title} className="transition-all hover:shadow-lg">
            <Link href={item.href}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  <CardTitle>{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
