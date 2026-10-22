"use client";

import {
  BookOpen,
  Copy,
  Gauge,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
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
  { href: "/practice", label: "Practice", icon: BookOpen },
  { href: "/upload", label: "Upload notes", icon: UploadCloud },
  { href: "/practice/history", label: "Attempts", icon: History },
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
        <SidebarHeader className="border-b px-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/icons/favicon-32x32.png"
                alt="TiCLearn Logo"
                width={32}
                height={32}
                className="h-8 w-8 text-primary"
              />
              <span className="text-xl font-bold">{TIP_NAME}</span>
            </Link>
            <Button
              onClick={handleCreateConversation}
              size="sm"
              variant="secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {workspaceLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  asChild
                  className="justify-start gap-2 rounded-xl text-xs"
                  key={item.href}
                  size="sm"
                  variant={
                    pathname.startsWith(item.href) ? "secondary" : "ghost"
                  }
                >
                  <Link href={item.href}>
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <div className="px-3 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
          </div>

          {isPending ? (
            <div
              className="space-y-2 px-2"
              data-slot="conversation-list-skeleton"
            >
              {placeholderKeys(5).map((key) => (
                <Skeleton key={key} className="h-8 w-full rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-5 py-3 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <ScrollArea className="flex-1">
              {filteredAndGrouped.length === 0 && searchQuery ? (
                <p className="px-5 py-3 text-sm text-muted-foreground">
                  No conversations matching “{searchQuery}”
                </p>
              ) : (
                filteredAndGrouped.map((group) => (
                  <SidebarGroup key={group.label}>
                    <SidebarGroupLabel className="px-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2">
                        {group.conversations.map((conversation) => {
                          const active =
                            pathname === `/chat/${conversation.id}`;
                          return (
                            <SidebarMenuItem
                              key={conversation.id}
                              className="group/menu-item flex w-full items-center gap-1 rounded-xl px-1"
                            >
                              <SidebarMenuButton
                                asChild
                                className="min-w-0 flex-1 rounded-xl"
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
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    aria-label={`Actions for ${conversation.title}`}
                                    className="h-7 w-7 shrink-0 opacity-80 transition-opacity md:opacity-0 md:group-hover/menu-item:opacity-100"
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
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

        <SidebarFooter className="border-t p-3">
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
