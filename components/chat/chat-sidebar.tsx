"use client";

import { Loader2, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useChatConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/hooks/useChat";
import { ChatUsageCard } from "./chat-usage-card";
import Image from "next/image";

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

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, isLoading } = useChatConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateConversation = async () => {
    try {
      const result = await createConversation.mutateAsync();
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
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
      ? conversations.filter((c: Conversation) =>
          c.title.toLowerCase().includes(q),
        )
      : conversations;

    const groups: Record<string, Conversation[]> = {};
    for (const conv of filtered) {
      const label = formatGroupLabel(
        new Date(conv.updatedAt || conv.createdAt),
      );
      if (!groups[label]) groups[label] = [];
      groups[label].push(conv);
    }

    const order = ["Today", "Yesterday", "This Week", "This Month", "Older"];
    return order
      .filter((l) => groups[l])
      .map((l) => ({ label: l, conversations: groups[l] }));
  }, [conversations, searchQuery]);

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="border-b px-3 py-[1.2rem]">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/icons/favicon-32x32.png"
              alt="TiCLearn Logo"
              width={32}
              height={32}
              className="h-8 w-8 text-primary"
            />
            <span className="text-xl font-bold">TiC</span>
          </Link>
          <Button
            onClick={handleCreateConversation}
            size="sm"
            variant="secondary"
          >
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading chats...</span>
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-5 py-3 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ScrollArea className="flex-1">
            {filteredAndGrouped.length === 0 && searchQuery ? (
              <p className="px-5 py-3 text-sm text-muted-foreground">
                No conversations matching "{searchQuery}"
              </p>
            ) : (
              filteredAndGrouped.map((group) => (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className="px-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="px-2">
                      {group.conversations.map((conv) => (
                        <SidebarMenuItem
                          key={conv.id}
                          className="group flex items-center gap-1.5 pr-1 w-full relative"
                        >
                          <SidebarMenuButton
                            asChild
                            className="flex-1 line-clamp-1"
                            isActive={pathname === `/chat/${conv.id}`}
                          >
                            <Link
                              href={`/chat/${conv.id}`}
                              className="w-full line-clamp-1"
                            >
                              {conv.title}
                            </Link>
                          </SidebarMenuButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                className="h-7 w-7 hidden group-hover:block absolute top-1/2 right-2 -translate-y-1/2"
                                size="icon"
                                variant="ghost"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => toast.info("Rename coming soon")}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={deleteConversation.isPending}
                                onClick={() =>
                                  handleDeleteConversation(conv.id)
                                }
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      ))}
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
  );
}
