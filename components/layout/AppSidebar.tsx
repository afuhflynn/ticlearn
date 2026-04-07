"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Home,
  Upload,
  ListTodo,
  BarChart3,
  MessageSquare,
  Users,
  Trophy,
  BookOpen,
  MessageCircle,
  CreditCard,
  Link2,
  Settings,
  Shield,
  ChevronLeft,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
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
import { PlanBadge } from "@/components/app/PlanBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  { href: "/chat", icon: MessageSquare, label: "AI Tutor" },
];

const accountNavItems = [
  { href: "/feedback", icon: MessageCircle, label: "Feedback" },
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
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const NavContent = () => (
    <>
      <SidebarHeader className="border-b px-4 py-3">
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
          <SidebarGroupLabel className="px-3">Study</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studyNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <a
                      href={item.paid ? "/pricing" : item.href}
                      className={cn(
                        "flex items-center gap-3",
                        item.paid && "opacity-70",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.paid && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          PRO
                        </span>
                      )}
                    </a>
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
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {isPending ? (
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : session ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user?.image ?? ""} />
              <AvatarFallback>
                {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {session.user?.name}
              </p>
              <PlanBadge plan="FREE" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                signOut().then(() => router.push("/sign-in"));
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button className="w-full" asChild>
            <a href="/sign-in">Sign In</a>
          </Button>
        )}
      </SidebarFooter>
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
