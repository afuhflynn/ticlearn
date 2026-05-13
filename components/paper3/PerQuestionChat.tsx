"use client";

import { useState, useRef, useEffect } from "react";
import { usePaper3Chat } from "@/hooks";
import {
  Send,
  Bot,
  X,
  Minimize2,
  Maximize2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";

interface PerQuestionChatProps {
  attemptId: string;
  questionId: string;
  questionTitle: string;
  questionNumber: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

const MAX_MESSAGES = 2;
const STORAGE_KEY_PREFIX = "tic-question-chat";

function getStorageKey(attemptId: string, questionId: string): string {
  return `${STORAGE_KEY_PREFIX}-${attemptId}-${questionId}`;
}

function loadFromStorage(attemptId: string, questionId: string): Message[] {
  try {
    const key = getStorageKey(attemptId, questionId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load chat from storage:", e);
  }
  return [];
}

function saveToStorage(attemptId: string, questionId: string, messages: Message[]) {
  try {
    const key = getStorageKey(attemptId, questionId);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (e) {
    console.error("Failed to save chat to storage:", e);
  }
}

function clearFromStorage(attemptId: string, questionId: string) {
  try {
    const key = getStorageKey(attemptId, questionId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Failed to clear chat from storage:", e);
  }
}

export function PerQuestionChat({
  attemptId,
  questionId,
  questionTitle,
  questionNumber,
  isOpen: controlledIsOpen,
  onOpenChange,
}: PerQuestionChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = usePaper3Chat();

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const messagesUsed = messages.filter((m) => m.role === "user").length;
  const messagesRemaining = Math.max(0, MAX_MESSAGES - messagesUsed);
  const canSendMessage = messagesRemaining > 0 && !isLoading;

  useEffect(() => {
    const loaded = loadFromStorage(attemptId, questionId);
    if (loaded.length > 0) {
      setMessages(loaded);
    }
  }, [attemptId, questionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      saveToStorage(attemptId, questionId, messages);
    }
  }, [messages, attemptId, questionId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !canSendMessage) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        attemptId,
        questionId,
        messages: messages.filter((m) => m.role === "user").map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.response, timestamp: Date.now() },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm("Clear chat history for this question?")) {
      setMessages([]);
      clearFromStorage(attemptId, questionId);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      if (!isMinimized) {
        setIsMinimized(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        variant="outline"
        size="sm"
        className="mt-2 inline-flex items-center gap-1 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
      >
        <MessageCircle className="h-3 w-3" />
        Ask TiC
        {messagesUsed > 0 && (
          <span className="ml-1 text-xs bg-purple-200 px-1.5 py-0.5 rounded-full">
            {messagesUsed}
          </span>
        )}
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
        >
          <Bot className="h-3.5 w-3.5" />
          <span>TiC</span>
          {messagesUsed > 0 && (
            <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {messagesUsed}
            </span>
          )}
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setIsMinimized(false);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-purple-200 rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-purple-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">
            Q{questionNumber}: {questionTitle.slice(0, 40)}
            {questionTitle.length > 40 ? "..." : ""}
          </span>
          <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
            {messagesRemaining} left
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-purple-200 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-3.5 w-3.5 text-purple-600" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-purple-200 rounded transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5 text-purple-600" />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            className="p-1 hover:bg-purple-200 rounded transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5 text-purple-600" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-800">
              Ask me about this question! You have {messagesRemaining} free messages.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block p-2 rounded-lg max-w-[90%] ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-gray-100">
              <span className="animate-pulse text-gray-500">Thinking...</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              canSendMessage
                ? "Ask TiC about this question..."
                : "Message limit reached"
            }
            className="flex-1 text-sm border rounded px-2 py-1.5"
            disabled={!canSendMessage}
          />
          <Button
            onClick={handleSend}
            size="sm"
            disabled={!input.trim() || !canSendMessage || isLoading}
            className="px-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}