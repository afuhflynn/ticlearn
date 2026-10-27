"use client";

import {
  BookOpen,
  Copy,
  Gauge,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  SquarePen,
  Trash2,
  UploadCloud,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChatAccountRow } from "@/components/chat/chat-account-row";
import { ChatSearchRow } from "@/components/chat/chat-search";
import { TIP_NAME } from "@/components/chat/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useChatConversations,
  useDeleteConversation,
  useUpdateConversation,
} from "@/hooks/useChat";
import {
  type ConversationSummary,
  groupConversationsByRecency,
} from "@/lib/chat/conversations";
import { placeholderKeys } from "@/lib/placeholder-keys";
import { cn } from "@/lib/utils";

type Conversation = ConversationSummary;

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/upload", label: "Upload notes", icon: UploadCloud },
  { href: "/quizzes", label: "Quizzes", icon: BookOpen },
];

/**
 * The brand block. Expanded it reads logo and name; in the collapsed rail the
 * name drops and the logo swaps to the sidebar toggle on hover, with the real
 * keyboard shortcut in the tooltip.
 */
function BrandBlock() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const [shortcutPrefix, setShortcutPrefix] = useState<string | null>(null);

  // The shortcut label waits for the client, because the platform check on
  // the server would disagree with a Mac browser and tear on hydration.
  useEffect(() => {
    setShortcutPrefix(
      /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘" : "Ctrl",
    );
  }, []);

  const logo = (
    <Image
      alt={`${TIP_NAME} logo`}
      className="size-7"
      height={28}
      src="/icons/favicon-32x32.png"
      width={28}
    />
  );

  if (isMobile || state !== "collapsed") {
    return (
      <Link
        className="flex items-center gap-2 px-1.5 py-0.5 text-sm font-semibold tracking-tight"
        href="/dashboard"
      >
        {logo}
        {TIP_NAME}
      </Link>
    );
  }

  return (
    <div className="group/logo relative flex size-8 items-center justify-center">
      {logo}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="pointer-events-none absolute inset-0 size-8 rounded-lg opacity-0 transition-opacity group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
              onClick={toggleSidebar}
              size="icon"
              variant="ghost"
            >
              <PanelLeft className="size-4" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle sidebar</p>
            {shortcutPrefix && (
              <KbdGroup>
                <Kbd>{shortcutPrefix}</Kbd>
                <Kbd>B</Kbd>
              </KbdGroup>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, isPending } = useChatConversations();
  const updateConversation = useUpdateConversation();
  const deleteConversation = useDeleteConversation();
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const openRenameDialog = (conversation: Conversation) => {
    setRenameTarget(conversation);
    setRenameTitle(conversation.title);
  };

  const handleRenameConversation = async () => {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      toast.error("Conversation title cannot be empty");
      return;
    }

    try {
      await updateConversation.mutateAsync({ id: renameTarget.id, title });
      toast.success("Conversation renamed");
      setRenameTarget(null);
      setRenameTitle("");
    } catch {
      toast.error("Failed to rename conversation");
    }
  };

  const handleCopyLink = async (conversationId: string) => {
    const url = `${window.location.origin}/chat/${conversationId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Conversation link copied");
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation.mutateAsync(conversationId);

      if (pathname === `/chat/${conversationId}`) {
        router.replace("/chat");
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const grouped = useMemo(
    () => groupConversationsByRecency(conversations as ConversationSummary[]),
    [conversations],
  );

  return (
    <>
      {/* The rail survives closing: collapsible="icon" keeps a slim column
          with the brand, new chat and search as icons, like ChatGPT. */}
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="p-2 pb-1.5">
          <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <BrandBlock />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-2 pt-1">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {/* New chat is a route, not a draft: nothing is created until
                    the student sends the first message. As a row it can carry
                    its label when expanded and its icon in the rail. */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="rounded-[var(--radius)] text-sm"
                    isActive={pathname === "/chat"}
                    tooltip="New chat"
                  >
                    <Link href="/chat">
                      <SquarePen />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        New chat
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <ChatSearchRow />

                {workspaceLinks.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className="rounded-[var(--radius)] text-sm"
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="text-muted-foreground" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isPending ? (
            <div
              className="group-data-[collapsible=icon]:hidden space-y-2 px-4 pt-1"
              data-slot="conversation-list-skeleton"
            >
              {placeholderKeys(5).map((key) => (
                <Skeleton
                  key={key}
                  className="h-8 w-full rounded-[var(--radius)]"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="group-data-[collapsible=icon]:hidden px-4 pt-2 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="group-data-[collapsible=icon]:hidden min-h-0 flex-1 overflow-y-auto">
              {grouped.map((group) => (
                <SidebarGroup className="px-2" key={group.label}>
                  <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {group.conversations.map((conversation) => {
                        const active = pathname === `/chat/${conversation.id}`;
                        return (
                          <SidebarMenuItem
                            className="group/menu-item relative"
                            key={conversation.id}
                          >
                            <SidebarMenuButton
                              asChild
                              className="truncate rounded-[var(--radius)] text-sm"
                              isActive={active}
                            >
                              <Link
                                href={`/chat/${conversation.id}`}
                                className="min-w-0 truncate"
                              >
                                {conversation.title}
                              </Link>
                            </SidebarMenuButton>
                            {/* The actions sit as the primitive's own menu
                                action: always aligned, title truncates into
                                the reserved space, revealed on hover. */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                  className={cn(
                                    "md:transition-opacity",
                                    "md:opacity-0",
                                    "md:group-hover/menu-item:opacity-100",
                                    "md:group-focus-within/menu-item:opacity-100",
                                    "md:focus-visible:opacity-100",
                                    "md:data-[state=open]:opacity-100",
                                  )}
                                >
                                  <MoreHorizontal className="size-3.5" />
                                  <span className="sr-only">
                                    Actions for {conversation.title}
                                  </span>
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => openRenameDialog(conversation)}
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleCopyLink(conversation.id)
                                  }
                                >
                                  <Copy className="mr-2 h-3.5 w-3.5" />
                                  Copy link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  disabled={deleteConversation.isPending}
                                  onClick={() =>
                                    handleDeleteConversation(conversation.id)
                                  }
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t p-2 pb-3">
          {/* ChatGPT's last row is the human. The usage card is gone from
              here: the count lives as a line on the composer while it is
              nearly spent, and the spent block replaces the composer. */}
          <ChatAccountRow />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog
        onOpenChange={(open) => !open && setRenameTarget(null)}
        open={!!renameTarget}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              Give this thread a short title so it is easier to find later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="conversation-title">Title</Label>
            <Input
              id="conversation-title"
              onChange={(event) => setRenameTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRenameConversation();
                }
              }}
              value={renameTitle}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateConversation.isPending}
              onClick={handleRenameConversation}
            >
              {updateConversation.isPending ? "Saving..." : "Save title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
