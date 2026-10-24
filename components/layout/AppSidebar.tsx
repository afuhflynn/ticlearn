"use client";

import {
  ArrowRight,
  BotMessageSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Crown,
  Flame,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Sparkles,
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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCredits, usePlan, useUsage, useUserStats } from "@/hooks";
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
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({ account: false, admin: false });

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";
  const userName = session?.user?.name || "Learner";
  const userInitial = userName.charAt(0).toUpperCase();

  const { isLoading: planLoading, plan } = usePlan();
  const { data: creditsData, isPending: creditsPending } = useCredits();
  const { usage, chatDailyUsage } = useUsage();
  const { stats, isPending: statsPending } = useUserStats();

  const creditBalance = creditsData?.balance ?? 0;
  const showCreditsTopUp =
    !creditsPending &&
    typeof creditsData?.balance === "number" &&
    creditBalance > 0;
  const isPaid = plan === "STANDARD" || plan === "PREMIUM";
  const streak = stats?.currentStreak ?? 0;
  const totalPoints = stats?.totalPoints ?? 0;
  const aiMessagesUsed = chatDailyUsage?.used ?? 0;
  const aiMessagesLimit = chatDailyUsage?.limit ?? 8;
  const aiMessagesRemaining = Math.max(0, aiMessagesLimit - aiMessagesUsed);
  const isPremium = plan === "PREMIUM";

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
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                Hi, {userName.split(" ")[0]}
              </p>
              {!statsPending && streak > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{streak}-day streak</span>
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">{totalPoints} pts</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {!planLoading && plan && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {isPremium ? (
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>
                {plan === "PREMIUM"
                  ? "Premium"
                  : plan === "STANDARD"
                    ? "Standard"
                    : plan === "STARTER"
                      ? "Starter"
                      : "Free"}
              </span>
            </div>
          </div>
        )}
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
              {!isPremium && (
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-tight",
                    isActive("/chat")
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground",
                  )}
                >
                  {aiMessagesRemaining > 0
                    ? `${aiMessagesRemaining} messages today`
                    : "No messages left"}
                </p>
              )}
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

        {/* Study */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel
            className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            onClick={() => toggleSection("account")}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Account</span>
            </div>
            {expandedSections.account ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {expandedSections.account && (
            <SidebarGroupContent>
              <SidebarMenu>
                {accountNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.href === "/subscription" &&
                          plan &&
                          !planLoading && (
                            <SidebarMenuBadge>
                              {plan === "PREMIUM" ? "Premium" : "Free"}
                            </SidebarMenuBadge>
                          )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
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

      {!isPending && !planLoading && !isAdmin && (
        <SidebarFooter className="border-t p-3">
          {!isPaid ? (
            <Link
              href="/subscription"
              className="group flex items-center gap-3 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/[0.02] px-3 py-2.5 transition-all hover:border-primary/40 hover:from-primary/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {showCreditsTopUp
                    ? `${creditBalance.toLocaleString()} credits`
                    : "Upgrade plan"}
                </p>
                <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                  {showCreditsTopUp
                    ? "Top up anytime"
                    : "Unlock unlimited practice"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </Link>
          ) : showCreditsTopUp ? (
            <Link
              href="/subscription#credits-top-up"
              className="group flex items-center gap-3 rounded-lg border border-transparent bg-muted/50 px-3 py-2.5 transition-all hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted-foreground/10">
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {creditBalance.toLocaleString()} credits
                </p>
                <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                  Buy more
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </SidebarFooter>
      )}
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
