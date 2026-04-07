"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  MessageCircle,
  CreditCard,
  Link2,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

const stats = [
  { title: "Total Users", value: "0", icon: Users, href: "/admin/users" },
  {
    title: "Active Subscriptions",
    value: "0",
    icon: CreditCard,
    href: "/admin/subscriptions",
  },
  {
    title: "Pending Feedback",
    value: "0",
    icon: MessageCircle,
    href: "/admin/feedback",
  },
  {
    title: "Active Affiliates",
    value: "0",
    icon: Link2,
    href: "/admin/affiliates",
  },
];

const navItems = [
  {
    title: "Users",
    icon: Users,
    href: "/admin/users",
    description: "Manage user accounts and roles",
  },
  {
    title: "Feedback",
    icon: MessageCircle,
    href: "/admin/feedback",
    description: "Review and respond to user feedback",
  },
  {
    title: "Subscriptions",
    icon: CreditCard,
    href: "/admin/subscriptions",
    description: "View and manage subscriptions",
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

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
        {stats.map((stat) => (
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
