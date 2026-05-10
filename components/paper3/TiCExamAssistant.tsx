"use client";

import { useState, useRef, useEffect } from "react";
import { usePaper3Chat } from "@/hooks";
import { Send, Bot, X, Minimize2, Maximize2, MessageCircle, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface TiCExamAssistantProps {
  attemptId: string;
  questionId?: string | null;
  onMessage?: () => boolean;
  maxMessages?: number;
  messagesUsed?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function TiCExamAssistant({ 
  attemptId, 
  questionId = null, 
  onMessage,
  maxMessages = -1,
  messagesUsed = 0,
}: TiCExamAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatMutation = usePaper3Chat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesRemaining = maxMessages === -1 ? -1 : maxMessages - messagesUsed;
  const canSendMessage = maxMessages === -1 || messagesRemaining > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    if (!canSendMessage) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (onMessage) {
      const allowed = onMessage();
      if (!allowed) {
        setMessages((prev) => [...prev, { role: "assistant", content: "You've reached your message limit for this exam. Upgrade to Premium for unlimited assistance." }]);
        return;
      }
    }

    try {
      const response = await chatMutation.mutateAsync({
        attemptId,
        questionId,
        messages: [...messages, userMessage],
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.response },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Try again." },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <div
        className={`fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl flex flex-col transition-all z-50 ${
          isMinimized ? "h-14 w-72" : "h-[450px] w-96"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b bg-primary text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-medium text-sm">TiC Exam Assistant</span>
            {maxMessages !== -1 && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {messagesRemaining} msgs
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800 text-center">
                    Hi! I'm TiC, your exam assistant. Ask me about the questions you found challenging!
                    {maxMessages !== -1 && (
                      <span className="block mt-1 text-xs">
                        You have {messagesRemaining} free messages.
                      </span>
                    )}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="text-left">
                  <span className="inline-block p-3 rounded-lg bg-gray-100">
                    <span className="animate-pulse text-gray-500">Thinking...</span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={canSendMessage ? "Ask TiC about this question..." : "Message limit reached"}
                  className="flex-1 text-sm border rounded-lg px-3 py-2"
                  disabled={!canSendMessage || chatMutation.isPending}
                />
                <Button
                  onClick={handleSend}
                  size="sm"
                  disabled={!input.trim() || !canSendMessage || chatMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              You've used all your free AI assistant messages for this exam.
              Upgrade to Premium for unlimited AI assistance and other exclusive features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Unlimited AI assistant messages</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Unlimited exam retakes</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>View detailed AI explanations</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Shareable result cards</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => window.location.href = "/subscription"}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}