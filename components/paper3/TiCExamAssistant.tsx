"use client";

import { useState, useRef, useEffect } from "react";
import { usePaper3Chat, useCredits } from "@/hooks";
import {
  Send,
  Bot,
  X,
  Minimize2,
  Maximize2,
  MessageCircle,
  Crown,
  Lock,
  Coins,
  ExternalLink,
} from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
  const [showCreditModal, setShowCreditModal] = useState(false);
  const chatMutation = usePaper3Chat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: creditsData } = useCredits();
  const creditBalance = creditsData?.balance ?? 0;

  const AI_TUTOR_COST = 5;
  const hasEnoughCredits = creditBalance >= AI_TUTOR_COST;

  const messagesRemaining =
    maxMessages === -1 ? -1 : maxMessages - messagesUsed;
  const canSendMessage =
    (maxMessages === -1 || messagesRemaining > 0) && hasEnoughCredits;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    if (!canSendMessage && hasEnoughCredits) {
      setShowUpgradeModal(true);
      return;
    }

    if (!hasEnoughCredits) {
      setShowCreditModal(true);
      return;
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (onMessage) {
      const allowed = onMessage();
      if (!allowed) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "You've reached your message limit for this exam. Upgrade to Premium for unlimited assistance.",
          },
        ]);
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
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Try again.",
        },
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
        className={`fixed bottom-4 md:right-4 right-1 bg-white rounded-xl shadow-2xl flex flex-col transition-all z-50 ${
          isMinimized ? "h-14 w-72" : "md:h-[600px] h-[450px] md:w-96 w-screen"
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
          <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            <Coins className="h-3 w-3" />
            {creditBalance}
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
                    Hi! I'm TiC, your exam assistant. Ask me about the questions
                    you found challenging!
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
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
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
                    <span className="animate-pulse text-gray-500">
                      Thinking...
                    </span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t">
              {hasEnoughCredits ? (
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
                    className="flex-1 text-sm border rounded-lg px-3 py-2"
                    disabled={!canSendMessage || chatMutation.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    size="sm"
                    disabled={
                      !input.trim() || !canSendMessage || chatMutation.isPending
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-3 text-center">
                  <Coins className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    Not enough credits
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    You need {AI_TUTOR_COST} credits per message. Your balance: {creditBalance}.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => (window.location.href = "/subscription#credits-top-up")}
                  >
                    <Coins className="h-3 w-3" />
                    Buy credits
                  </Button>
                </div>
              )}
              {hasEnoughCredits && maxMessages !== -1 && !canSendMessage && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Message limit reached.
                  <button
                    className="ml-1 text-primary underline"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    Upgrade for more
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Out of credits
            </DialogTitle>
            <DialogDescription>
              You need at least {AI_TUTOR_COST} credits to send a message. Your
              current balance is {creditBalance} credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Credits are used across all features — quizzes, mocks, and AI
              tutoring. Buying credits gives you access to everything without a
              monthly commitment.
            </p>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Why buy credits?</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc pl-4">
                <li>Pay only for what you use — no monthly fee</li>
                <li>Works for all features: AI chat, quizzes, mocks</li>
                <li>Never expires</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Subscribers get free credits every month
              + discounts on all credit costs.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreditModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => (window.location.href = "/subscription#credits-top-up")}>
              <Coins className="h-4 w-4 mr-1" />
              Buy credits
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreditModal(false);
                setShowUpgradeModal(true);
              }}
            >
              <Crown className="h-4 w-4 mr-1" />
              View plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              You've used all your free AI assistant messages for this exam.
              Upgrade to Premium for unlimited AI assistance and other exclusive
              features.
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
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Maybe Later
            </Button>
            <Button onClick={() => (window.location.href = "/subscription")}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
