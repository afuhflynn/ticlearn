"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BotMessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  Link2,
  ListTodo,
  LucideLayoutDashboard,
  MessageCircle,
  Settings,
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

interface NavSection {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  paid?: boolean;
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LucideLayoutDashboard },
  { href: "/upload", label: "Upload Notes", icon: Upload },
  { href: "/quizzes", label: "My Quizzes", icon: ListTodo },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/chat", label: "TiC", icon: BotMessageSquare },
  // Will become paid maybe later
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, paid: false },
];

const learningNavItems: NavItem[] = [
  // { href: "/gce-exams", label: "GCE Exams", icon: BookOpen, paid: true },
  // Will reuire payment later
  { href: "/practice", label: "Practice", icon: GraduationCap, paid: false },
];

const communityNavItems: NavItem[] = [
  { href: "/community", label: "Community", icon: Users, paid: true },
];

const accountNavItems: NavItem[] = [
  { href: "/feedback", label: "Feedback", icon: MessageCircle },
  { href: "/affiliate", label: "Affiliate", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LucideLayoutDashboard },
  { href: "/admin/users", label: "Manage Users", icon: Settings },
];

const navSections: NavSection[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    defaultOpen: true,
    items: mainNavItems,
  },
  {
    id: "learning",
    label: "My Learning",
    defaultOpen: true,
    items: learningNavItems,
  },
  {
    id: "connect",
    label: "Connect",
    defaultOpen: false,
    items: communityNavItems,
  },
  {
    id: "account",
    label: "My Account",
    defaultOpen: false,
    items: accountNavItems,
  },
  {
    id: "admin",
    label: "Admin Panel",
    defaultOpen: false,
    items: adminNavItems,
  },
];

export function AppSidebar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((section) => {
      initial[section.id] = section.defaultOpen ?? false;
    });
    return initial;
  });

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const { isLoading, plan } = usePlan();

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const NavContent = () => (
    <>
      <SidebarHeader className="border-b px-4 py-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold">TiCLearn</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => {
          if (section.id === "admin" && !isAdmin) return null;

          const isExpanded = expandedSections[section.id] ?? false;
          // const SectionIcon = section.icon;

          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-2">
                  {/* <SectionIcon className="h-4 w-4" /> */}
                  <span className="text-sm font-medium">{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </SidebarGroupLabel>
              {isExpanded && (
                <SidebarGroupContent className="pl-2">
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const isActive =
                        section.id === "admin"
                          ? pathname.startsWith(item.href)
                          : pathname === item.href;

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link
                              href={
                                item.paid && !isAdmin
                                  ? "/subscription"
                                  : item.href
                              }
                              className={cn(
                                "flex items-center gap-3",
                                item.paid && !isAdmin && "opacity-70",
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                              {item.paid && !isAdmin && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  PRO
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {!isPending && !isLoading && !isAdmin && (
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
                  <Link href="/subscription">
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
