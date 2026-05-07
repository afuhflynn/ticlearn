"use client";

import { useState, useRef, useEffect } from "react";
import { usePaper3Chat } from "@/hooks";
import { Send, Bot, X, Minimize2, Maximize2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TiCExamAssistantProps {
  attemptId: string;
  questionId?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function TiCExamAssistant({ attemptId, questionId = null }: TiCExamAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatMutation = usePaper3Chat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

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
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl flex flex-col transition-all ${
        isMinimized ? "h-14 w-72" : "h-[400px] w-80"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">TiC Exam Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                Hi! I'm TiC, your exam assistant. Ask me any question about this
                exam!
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.role === "user"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <span
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {msg.content}
                </span>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="text-left">
                <span className="inline-block p-2 rounded-lg bg-gray-100">
                  <span className="animate-pulse">Thinking...</span>
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
                placeholder="Ask TiC..."
                className="flex-1 text-sm border rounded-lg px-3 py-2"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                size="sm"
                disabled={!input.trim() || chatMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}