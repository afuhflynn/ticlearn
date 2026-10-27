"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatConversations } from "@/hooks/useChat";
import {
  type ConversationSummary,
  groupConversationsByRecency,
} from "@/lib/chat/conversations";
import { placeholderKeys } from "@/lib/placeholder-keys";

/**
 * ChatGPT-placed search: an icon in the top bar beside the sidebar toggle on
 * desktop, a rail icon when collapsed, and never an inline input. The input
 * lives in this modal, so the sidebar keeps its width for conversations.
 */
function ChatSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { conversations, isPending } = useChatConversations();

  const grouped = useMemo(
    () => groupConversationsByRecency(conversations as ConversationSummary[]),
    [conversations],
  );

  return (
    <CommandDialog
      description="Search your Tip conversations and jump to one."
      onOpenChange={onOpenChange}
      open={open}
      title="Search chats"
    >
      <CommandInput placeholder="Search chats..." />
      <CommandList className="max-h-80">
        {isPending ? (
          <div className="space-y-1 p-2" data-slot="chat-search-skeleton">
            {placeholderKeys(5).map((key) => (
              <Skeleton
                key={key}
                className="h-8 w-full rounded-[var(--radius)]"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <CommandEmpty>No conversations yet.</CommandEmpty>
        ) : (
          <>
            <CommandEmpty>No chat matches that search.</CommandEmpty>
            {grouped.map((group) => (
              <CommandGroup heading={group.label} key={group.label}>
                {group.conversations.map((conversation) => (
                  <CommandItem
                    key={conversation.id}
                    onSelect={() => {
                      onOpenChange(false);
                      router.push(`/chat/${conversation.id}`);
                    }}
                    value={conversation.title}
                  >
                    {conversation.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** The sidebar's own trigger, a row that becomes an icon-only button in the rail. */
export function ChatSearchRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="rounded-[var(--radius)] text-sm"
          onClick={() => setOpen(true)}
          tooltip="Search chats"
        >
          <Search className="text-muted-foreground" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Search chats
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <ChatSearchDialog onOpenChange={setOpen} open={open} />
    </>
  );
}

/** The top bar trigger beside the sidebar toggle while the sidebar is expanded. */
export function ChatSearchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={() => setOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Search className="size-4" />
              <span className="sr-only">Search chats</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Search chats</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ChatSearchDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
