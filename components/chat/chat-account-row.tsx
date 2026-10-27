"use client";

import { LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { planCatalog } from "@/constants/plans";
import { usePlan } from "@/hooks";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * The row a student ends every read on: who they are and the plan they sit
 * on, ChatGPT-style. The menu opens above the row because the row is at the
 * very bottom of the screen.
 */
export function ChatAccountRow() {
  const { data: session } = useSession();
  const { plan } = usePlan();
  const router = useRouter();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const planLabel = planCatalog[plan]?.label ?? planCatalog.FREE.label;
  const isFree = planLabel === planCatalog.FREE.label;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="rounded-[var(--radius)]"
              size="lg"
              tooltip="Account"
            >
              <Avatar className="size-8">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="text-sm">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1 text-left">
                <p className="truncate text-sm leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{planLabel}</p>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/subscription")}>
              Subscription
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                signOut({
                  fetchOptions: {
                    onSuccess() {
                      router.push("/sign-in");
                    },
                  },
                });
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {isFree && (
        <SidebarMenuItem>
          {/* Our own offer, not a borrowed one: the catalogue names it, so the
              copy can never drift from what the pricing page actually sells. */}
          <SidebarMenuButton
            asChild
            className="group-data-[collapsible=icon]:hidden justify-center rounded-full border bg-accent/50 text-sm hover:bg-accent"
            size="lg"
          >
            <Link href="/pricing">
              <Sparkles className="size-4 text-muted-foreground" />
              Unlock the {planCatalog.PRO.label}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
