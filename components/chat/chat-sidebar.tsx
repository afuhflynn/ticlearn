"use client";

import {
  BookOpen,
  Copy,
  Gauge,
  MoreHorizontal,
  Pencil,
  SquarePen,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  SidebarRail,
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
  useCreateConversation,
  useDeleteConversation,
  useUpdateConversation,
} from "@/hooks/useChat";
import { placeholderKeys } from "@/lib/placeholder-keys";
import { ChatUsageCard } from "./chat-usage-card";

function formatGroupLabel(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 30) return "This Month";
  return "Older";
}

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/upload", label: "Upload notes", icon: UploadCloud },
  { href: "/quizzes", label: "Quizzes", icon: BookOpen },
];

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, isPending } = useChatConversations();
  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();
  const deleteConversation = useDeleteConversation();
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const handleCreateConversation = async () => {
    try {
      const result = await createConversation.mutateAsync({});
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

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

  const filteredAndGrouped = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered: Conversation[] = q
      ? conversations.filter((conversation: Conversation) =>
          conversation.title.toLowerCase().includes(q),
        )
      : conversations;

    const groups: Record<string, Conversation[]> = {};
    for (const conversation of filtered) {
      const label = formatGroupLabel(
        new Date(conversation.updatedAt || conversation.createdAt),
      );
      groups[label] = groups[label] ?? [];
      groups[label].push(conversation);
    }

    const order = ["Today", "Yesterday", "This Week", "This Month", "Older"];
    return order
      .filter((label) => groups[label])
      .map((label) => ({ label, conversations: groups[label] }));
  }, [conversations, searchQuery]);

  return (
    <>
      <Sidebar collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="p-2">
          <div className="flex items-center justify-between gap-1 py-0.5 pl-1.5">
            <Link
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
              href="/dashboard"
            >
              <Image
                alt={`${TIP_NAME} logo`}
                className="size-5"
                height={20}
                src="/icons/favicon-32x32.png"
                width={20}
              />
              {TIP_NAME}
            </Link>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-8"
                    onClick={handleCreateConversation}
                    size="icon"
                    variant="ghost"
                  >
                    <SquarePen className="size-4" />
                    <span className="sr-only">New chat</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 w-full rounded-[var(--radius)] border-0 bg-accent/50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-accent"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-2 pt-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {workspaceLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className="rounded-[var(--radius)] text-sm"
                        isActive={pathname.startsWith(item.href)}
                      >
                        <Link href={item.href}>
                          <Icon className="text-muted-foreground" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isPending ? (
            <div
              className="space-y-2 px-4 pt-1"
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
            <p className="px-4 pt-2 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <ScrollArea className="flex-1">
              {filteredAndGrouped.length === 0 && searchQuery ? (
                <p className="px-4 pt-2 text-sm text-muted-foreground">
                  No conversations matching “{searchQuery}”
                </p>
              ) : (
                filteredAndGrouped.map((group) => (
                  <SidebarGroup className="px-2" key={group.label}>
                    <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-0.5">
                        {group.conversations.map((conversation) => {
                          const active =
                            pathname === `/chat/${conversation.id}`;
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
                              <DropdownMenu>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          aria-label={`Actions for ${conversation.title}`}
                                          className="absolute right-1.5 top-1/2 size-7 -translate-y-1/2 opacity-80 transition-opacity md:opacity-0 md:group-focus-within/menu-item:opacity-100 md:group-hover/menu-item:opacity-100"
                                          size="icon"
                                          variant="ghost"
                                        >
                                          <MoreHorizontal className="size-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Options</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-44"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openRenameDialog(conversation)
                                    }
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
                ))
              )}
            </ScrollArea>
          )}
        </SidebarContent>

        <SidebarFooter className="p-2 pb-3">
          <ChatUsageCard compact />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
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
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRenameConversation();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameConversation}
              disabled={updateConversation.isPending}
            >
              {updateConversation.isPending ? "Saving..." : "Save title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
