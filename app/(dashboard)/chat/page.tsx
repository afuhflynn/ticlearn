"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    const saved = localStorage.getItem("ticlearn-chat-conversations");
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch {
        console.error("Failed to parse conversations");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "ticlearn-chat-conversations",
      JSON.stringify(conversations),
    );
  }, [conversations]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );
  const currentMessages = activeConversation?.messages || [];

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    };
    setConversations([...conversations, newConv]);
    setActiveConversationId(newConv.id);
  };

  const deleteConversation = (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
    };

    let newConvId = activeConversationId;
    if (activeConversationId) {
      setConversations(
        conversations.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: [...c.messages, userMessage],
              title:
                c.messages.length === 0 ? input.slice(0, 30) + "..." : c.title,
            };
          }
          return c;
        }),
      );
    } else {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: input.slice(0, 30) + "...",
        messages: [userMessage],
        createdAt: new Date(),
      };
      setConversations([...conversations, newConv]);
      newConvId = newConv.id;
    }

    const messageToSend = input;
    const currentConvId = newConvId;
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: messageToSend }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: data.response || "I'm here to help! Ask me anything.",
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === currentConvId) {
              return { ...c, messages: [...c.messages, aiMessage] };
            }
            return c;
          }),
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedPrompts = [
    "Explain photosynthesis in simple terms",
    "What are the key topics in GCE A-Level Biology?",
    "Help me understand quadratic equations",
    "What is the difference between DNA and RNA?",
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={createNewConversation} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${
                    activeConversationId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left truncate text-sm"
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    {conv.title}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteConversation(conv.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {!activeConversationId || currentMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Welcome to TiCLearn AI Tutor
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Your personal study assistant for GCE A-Level subjects
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {currentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <form
            onSubmit={handleSendMessage}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your studies..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI responses are generated by AI and may contain errors. Verify
            important information.
          </p>
        </div>
      </div>
    </div>
  );
}
