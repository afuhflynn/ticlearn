"use client";

import { Loader2, MessageSquareText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, isLoading } = useChatConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

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
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <SidebarMenu className="px-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading chats…</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No conversations yet.
                  </p>
                ) : (
                  conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <div className="group flex items-center gap-2">
                        <SidebarMenuButton
                          asChild
                          className="flex-1"
                          isActive={pathname === `/chat/${conversation.id}`}
                        >
                          <Link href={`/chat/${conversation.id}`}>
                            <span className="truncate">
                              {conversation.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                        <Button
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          disabled={deleteConversation.isPending}
                          onClick={() =>
                            handleDeleteConversation(conversation.id)
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <ChatUsageCard compact />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
