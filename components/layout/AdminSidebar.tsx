"use client";

import {
  BarChart3,
  CreditCard,
  FileText,
  GraduationCap,
  Link2,
  ListChecks,
  MessageCircle,
  Shield,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { FaMoneyBill1 } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";

const adminNavItems = [
  { href: "/admin", icon: BarChart3, label: "Dashboard" },
  { href: "/admin/metrics", icon: TrendingUp, label: "Analytics" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/feedback", icon: MessageCircle, label: "Feedback" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  {
    href: "/admin/payment-settings",
    icon: FaMoneyBill1,
    label: "Payment Settings",
  },
  { href: "/admin/affiliates", icon: Link2, label: "Affiliates" },
];

const paper3NavItems = [
  { href: "/admin/paper3/upload", icon: Upload, label: "Upload Source" },
  { href: "/admin/paper3/sources", icon: FileText, label: "Sources" },
  { href: "/admin/paper3/questions", icon: ListChecks, label: "Questions" },
  { href: "/admin/paper3/mocks", icon: GraduationCap, label: "Mock Exams" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="hidden md:flex" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2 py-2">
          <Image
            src="/icons/favicon-32x32.png"
            alt="TiCLearn Logo"
            width={32}
            height={32}
            className="h-8 w-8 text-primary"
          />
          <span className="font-bold">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3">GCE Paper 3</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {paper3NavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button variant="outline" className="w-full" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
