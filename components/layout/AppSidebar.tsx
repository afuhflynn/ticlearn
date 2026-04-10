"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronLeft,
  CreditCard,
  GraduationCap,
  Home,
  Link2,
  ListTodo,
  MessageCircle,
  MessageSquare,
  Settings,
  Shield,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardTitle } from "../ui/card";
import { usePlan } from "@/hooks";

const mainNavItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/upload", icon: Upload, label: "Upload Notes" },
  { href: "/quizzes", icon: ListTodo, label: "My Quizzes" },
  { href: "/progress", icon: BarChart3, label: "Progress" },
];

const studyNavItems = [
  { href: "/gce-exams", icon: BookOpen, label: "GCE Exams", paid: true },
  { href: "/community", icon: Users, label: "Community", paid: true },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard", paid: true },
  { href: "/chat", icon: MessageSquare, label: "TiC" },
];

const accountNavItems = [
  { href: "/feedback", icon: MessageCircle, label: "Feedback" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/affiliate", icon: Link2, label: "Affiliate" },
  { href: "/pricing", icon: CreditCard, label: "Pricing" },
];

const adminNavItems = [
  { href: "/admin", icon: Shield, label: "Admin" },
  { href: "/admin/users", icon: Settings, label: "Users" },
];

export function AppSidebar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const { isLoading, plan } = usePlan();

  const NavContent = () => (
    <>
      <SidebarHeader className="border-b px-4 py-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold">TiCLearn</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Study</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studyNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link
                      href={
                        item.paid && (session?.user as any)?.role !== "ADMIN"
                          ? "/pricing"
                          : item.href
                      }
                      className={cn(
                        "flex items-center gap-3",
                        item.paid &&
                          (session?.user as any)?.role !== "ADMIN" &&
                          "opacity-70",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {(session?.user as any)?.role !== "ADMIN" &&
                        item.paid && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            PRO
                          </span>
                        )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!isPending && !isLoading && (session?.user as any)?.role !== "ADMIN" && (
        <SidebarFooter className="border-t p-4">
          {plan && plan !== "STANDARD" && plan !== "PREMIUM" && (
            <Card className="border-primary/20 bg-primary/5 max-w-full!">
              <CardContent className="space-y-3">
                <CardTitle className="font-bold text-left">
                  Upgrade to Premium
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Unlock unlimited notes, quizzes, and access to GCE exams
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/pricing">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </SidebarFooter>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" collapsible="icon">
        <NavContent />
      </Sidebar>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
