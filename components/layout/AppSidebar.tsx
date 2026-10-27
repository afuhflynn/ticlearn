"use client";

import {
  ArrowRight,
  BotMessageSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Crown,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const studyNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
];

const accountNav: NavItem[] = [
  { href: "/subscription", label: "Subscription", icon: Crown },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Manage Users", icon: Users },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({ account: false, admin: false });

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";
  const userName = session?.user?.name || "Learner";
  const userInitial = userName.charAt(0).toUpperCase();

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname.startsWith("/admin");
    }
    return pathname === href;
  };

  const NavContent = () => (
    <>
      {/* Sidebar header: avatar only (no "Hi, name" line). The account row
          at the bottom of the sidebar carries the name and plan. */}
      <SidebarHeader className="p-2 pb-1.5">
        <div className="flex items-center justify-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Tip is the tutor, and chat is the first thing a student wants */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/chat"
            className={cn(
              "group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
              isActive("/chat")
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent hover:border-primary/40 hover:from-primary/10 hover:to-primary/5",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive("/chat")
                  ? "bg-primary-foreground/15"
                  : "bg-primary/10 group-hover:bg-primary/15",
              )}
            >
              <BotMessageSquare
                className={cn(
                  "h-4.5 w-4.5",
                  isActive("/chat")
                    ? "text-primary-foreground"
                    : "text-primary",
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold leading-tight",
                  isActive("/chat")
                    ? "text-primary-foreground"
                    : "text-foreground",
                )}
              >
                Tip
              </p>
            </div>
            <ArrowRight
              className={cn(
                "h-4 w-4 shrink-0 opacity-0 -translate-x-1 transition-all",
                isActive("/chat")
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
                "group-hover:opacity-100 group-hover:translate-x-0",
              )}
            />
          </Link>
        </div>

        {/* Study and account, one plain list. An account accordion hid two
            destinations behind a second tap for no gain. */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {studyNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
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
            <SidebarGroupLabel
              className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
              onClick={() => toggleSection("admin")}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Admin</span>
              </div>
              {expandedSections.admin ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </SidebarGroupLabel>
            {expandedSections.admin && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNav.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
    </>
  );

  return (
    <>
      <Sidebar className="hidden md:flex" collapsible="icon">
        <NavContent />
      </Sidebar>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50"
          >
            <NotebookPen className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
