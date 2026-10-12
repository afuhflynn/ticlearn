"use client";

import { type UIMessage } from "ai";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

const IDLE_DELAY = 3000;

function getLastUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const textParts = messages[i].parts?.filter((p) => p.type === "text") as
        | { text: string }[]
        | undefined;
      if (textParts && textParts.length > 0) {
        return textParts.map((p) => p.text).join("\n");
      }
      return "";
    }
  }
  return "";
}

export function ChatRatingBanner({
  conversationId,
  messages,
  status,
}: {
  conversationId: string;
  messages: UIMessage[];
  status: "ready" | "streaming" | "error" | "submitted";
}) {
  const [rated, setRated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`chat_rated_${conversationId}`) === "true";
  });
  const [showBanner, setShowBanner] = useState(false);
  const [rating, setRating] = useState<1 | 0 | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAssistantMessages = messages.some((m) => m.role === "assistant");
  const isIdle = status === "ready" && hasAssistantMessages;

  useEffect(() => {
    if (rated) return;
    if (!isIdle) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowBanner(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setShowBanner(true);
    }, IDLE_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isIdle, rated, messages.length]);

  if (rated || !showBanner) return null;

  const handleRate = async (value: 1 | 0) => {
    setRating(value);
    if (value === 1) {
      setSubmitting(true);
      try {
        const lastMessage = getLastUserMessage(messages);
        await api.mutations.feedback.createChatRating({
          conversationId,
          rating: value,
          message: lastMessage,
        });
        localStorage.setItem(`chat_rated_${conversationId}`, "true");
        setRated(true);
        toast.success("Thanks for your feedback!");
      } catch {
        toast.error("Failed to submit feedback");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSubmitWithComment = async () => {
    setSubmitting(true);
    try {
      const lastMessage = getLastUserMessage(messages);
      await api.mutations.feedback.createChatRating({
        conversationId,
        rating: 0,
        message: lastMessage,
        comment,
      });
      localStorage.setItem(`chat_rated_${conversationId}`, "true");
      setRated(true);
      toast.success("Thanks for your feedback!");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-4 max-w-3xl rounded-lg border bg-muted/30 p-4">
      {rating === null ? (
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground">
            Was this helpful?
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRate(1)}
              disabled={submitting}
            >
              <ThumbsUp className="mr-1 h-4 w-4" />
              Yes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRate(0)}
              disabled={submitting}
            >
              <ThumbsDown className="mr-1 h-4 w-4" />
              No
            </Button>
          </div>
        </div>
      ) : rating === 0 ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            What could be better?
          </p>
          <Textarea
            placeholder="Tell us what went wrong..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRating(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitWithComment}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Send feedback
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
